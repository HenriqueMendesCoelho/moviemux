<template>
  <BaseContainerMain class="mm-browse-scope">
    <header class="mm-discover-header">
      <p class="mm-eyebrow">Catálogo TMDB</p>
      <h1>Descobrir filmes<span>.</span></h1>
      <p>Encontre sua próxima sessão.</p>
    </header>
    <form
      class="mm-discover-toolbar mm-browse-toolbar mm-browse-toolbar-discover"
      @submit.prevent="submitSearch"
    >
      <div class="mm-autocomplete" @focusout="onSearchFocusOut">
        <label class="mm-toolbar-label" for="discover-search">Buscar no catálogo</label
        ><input
          id="discover-search"
          v-model="searchText"
          type="search"
          autocomplete="off"
          placeholder="Buscar por título…"
          role="combobox"
          :aria-expanded="suggestionsOpen && suggestions.length > 0"
          aria-controls="movie-suggestions"
          :aria-activedescendant="
            selectedSuggestion >= 0 ? `movie-suggestion-${selectedSuggestion}` : undefined
          "
          @focus="suggestionsOpen = true"
          @keydown.down.prevent="moveSelection(1)"
          @keydown.up.prevent="moveSelection(-1)"
          @keydown.esc="suggestionsOpen = false"
        />
        <ul
          v-if="suggestionsOpen && suggestions.length"
          id="movie-suggestions"
          class="mm-suggestions"
          role="listbox"
        >
          <li
            v-for="(movie, index) in suggestions"
            :id="`movie-suggestion-${index}`"
            :key="movie.id"
            role="option"
            :aria-selected="selectedSuggestion === index"
          >
            <button
              type="button"
              :class="{ 'mm-selected': selectedSuggestion === index }"
              @click="chooseSuggestion(movie.title)"
            >
              {{ movie.title }} <span>{{ movie.release_date?.slice(0, 4) }}</span>
            </button>
          </li>
        </ul>
      </div>
      <BaseSelect
        v-model="sort"
        class="mm-sort"
        label="Mostrar"
        :options="[
          { value: 'popular', label: 'Populares' },
          { value: 'playingNow', label: 'Nos cinemas' },
          { value: 'topRated', label: 'Melhores avaliações' },
          { value: 'voteAverageAsc', label: 'Menores avaliações' },
          { value: 'upcoming', label: 'Em breve' },
        ]"
        @change="applySort"
      />
      <label class="mm-discover-year"
        >Ano
        <input
          v-model="year"
          type="number"
          min="1870"
          max="9999"
          placeholder="Qualquer ano"
          @change="applyGenres"
        />
      </label>
      <BaseMultiSelect
        v-model="genreIds"
        :options="genreOptions"
        label="Gêneros"
        :loading="loadingGenres"
        :error="genreError"
        @change="applyGenres"
        @retry="loadGenres"
      />
      <button type="submit" class="mm-button mm-button-primary" :disabled="loading">Buscar</button>
      <button type="button" class="mm-discover-clear" @click="resetSearch">Limpar filtros</button>
    </form>
    <h2 class="mm-results-title">
      {{ error ? 'Não foi possível consultar o catálogo' : collectionTitle }}
    </h2>
    <p v-if="error" role="alert" class="mm-error">
      {{ error }}
      <button type="button" class="mm-button" @click="loadMovies(false)">Tentar novamente</button>
    </p>
    <div class="mm-discover-grid" :aria-busy="loading">
      <template v-if="loading && !movies.length">
        <div
          v-for="index in 8"
          :key="`loading-${index}`"
          class="mm-discover-skeleton"
          aria-hidden="true"
        >
          <div />
          <span /><span />
        </div>
      </template>
      <MovieDiscoverCardImage
        v-for="movie in movies"
        :key="movie.id"
        v-model="watchlists"
        :movie="movie"
        :adding="adding"
        @add-to-watchlist="addMovieToWatchlist($event.id, $event.movieId)"
        @call-tmdb="relatedMovies($event, movie.id)"
        @copy-url="copyMovie"
      />
    </div>
    <p v-if="loading" class="mm-status" role="status">Buscando sua próxima história…</p>
    <p v-if="!loading && !error && !movies.length" class="mm-status">
      Nenhum filme por aqui. Experimente outro título ou gênero.
    </p>
    <div ref="sentinel" aria-hidden="true" style="height: 1px" />
    <BaseFloatingActionBtn />
    <div class="mm-load-more">
      <button
        v-if="page < lastPage && movies.length"
        type="button"
        class="mm-button"
        :disabled="loading"
        @click="loadMovies(true)"
      >
        Carregar mais filmes
      </button>
    </div>
    <BaseDialogFormMovieSummary
      v-model="showSummary"
      :movie-id="summaryId"
      :external-rating="selectedExternalRating"
      @hide="closeSummary"
      ><template #prepend:bar
        ><details class="mm-summary-watchlists">
          <summary>Adicionar à lista</summary>
          <MovieDiscoverMenuWatchlist
            :watchlists="watchlists"
            :movie="summaryId"
            :disabled="adding"
            @add-movie="addMovieToWatchlist($event, summaryId)"
          /></details></template
    ></BaseDialogFormMovieSummary>
  </BaseContainerMain>
</template>
<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { MovieResultResponseTmdb } from 'src/core/types/movie/MovieType';
import type { WatchlistType } from 'src/core/types/movie-watchlist/WatchlistType';
import 'src/core/ui/filter-toolbar.css';
import BaseSelect from 'src/core/components/BaseSelect.vue';
import BaseMultiSelect from 'src/core/components/BaseMultiSelect.vue';
import BaseContainerMain from 'src/core/components/BaseContainerMain.vue';
import BaseDialogFormMovieSummary from 'src/core/components/BaseDialogFormMovieSummary.vue';
import BaseFloatingActionBtn from 'src/core/components/BaseFloatingActionBtn.vue';
import MovieDiscoverCardImage from '../components/MovieDiscoverCardImage.vue';
import MovieDiscoverMenuWatchlist from '../components/MovieDiscoverMenuWatchlist.vue';
import { useMovieRequests } from 'src/modules/movie/composables/useMovieRequests';
import { useInfinitePaging } from 'src/modules/movie/composables/useInfinitePaging';
import { useStyleStore } from 'src/core/stores/StyleStore';
import { useUserStore } from 'src/core/stores/UserStore';
import MovieWatchlistService from 'src/modules/movie-watchlist/services/MovieWatchlistService';
import KitService from 'src/core/services/KitService';
import MovieService from 'src/modules/movie/services/MovieService';
import { showError, showSuccess } from 'src/core/utils/NotificationUtils';
const route = useRoute(),
  router = useRouter(),
  requests = useMovieRequests(),
  style = useStyleStore(),
  user = useUserStore();
const searchText = ref(''),
  activeSearch = ref(''),
  sort = ref('popular'),
  genreIds = ref<number[]>([]),
  year = ref<number | string>('');
const genres = ref<{ id: number; name: string; tmdb_id: number }[]>([]),
  loadingGenres = ref(false),
  genreError = ref('');
const genreOptions = computed(() =>
  genres.value.map((genre) => ({ value: genre.tmdb_id, label: genre.name })),
);
const movies = ref<MovieResultResponseTmdb['results']>([]),
  suggestions = ref<MovieResultResponseTmdb['results']>([]);
const suggestionsOpen = ref(false),
  selectedSuggestion = ref(-1);
const watchlists = ref<WatchlistType[]>([]),
  page = ref(0),
  lastPage = ref(0),
  loading = ref(false),
  error = ref('');
const related = ref<{ id: number; type: string; label: string } | null>(null);
const showSummary = ref(false),
  summaryId = ref(0),
  adding = ref(false),
  sentinel = ref<HTMLElement>();
const selectedExternalRating = computed(() => {
  const selected = movies.value.find((movie) => movie.id === summaryId.value);
  return selected
    ? { movieId: selected.id, value: selected.vote_average, votes: selected.vote_count }
    : undefined;
});
let debounce: ReturnType<typeof setTimeout> | undefined,
  mounted = false;
const collectionTitle = computed(
  () =>
    related.value?.label ||
    (activeSearch.value
      ? `Resultados para “${activeSearch.value}”`
      : genreIds.value.length || year.value
        ? 'Filmes do seu jeito'
        : {
            popular: 'Em alta agora',
            playingNow: 'Nas telas dos cinemas',
            topRated: 'Vale cada minuto',
            voteAverageAsc: 'Do menor para o maior',
            upcoming: 'Ainda vem muita coisa boa',
          }[sort.value] || 'Descubra mais'),
);
useInfinitePaging(
  sentinel,
  computed(
    () =>
      !loading.value &&
      !error.value &&
      !showSummary.value &&
      movies.value.length > 0 &&
      page.value < lastPage.value,
  ),
  () => loadMovies(true),
);
watch(
  () => route.query.movie,
  (value) => {
    const id = Number(value);
    summaryId.value = Number.isInteger(id) && id > 0 ? id : 0;
    showSummary.value = summaryId.value > 0;
  },
  { immediate: true },
);
watch(searchText, (value) => {
  clearTimeout(debounce);
  const current = requests.begin('suggestions');
  selectedSuggestion.value = -1;
  suggestions.value = [];
  if (!value.trim()) return;
  debounce = setTimeout(async () => {
    if (!current() || !user.user.isLoged) return;
    try {
      const result = await KitService.searchByName({ query: value.trim(), page: 1 });
      if (current()) suggestions.value = result.results.slice(0, 8);
    } catch {
      if (current()) suggestions.value = [];
    }
  }, 250);
});
watch(
  requests.context,
  () => {
    clearTimeout(debounce);
    movies.value = [];
    suggestions.value = [];
    watchlists.value = [];
    loading.value = false;
    adding.value = false;
    page.value = 0;
    lastPage.value = 0;
    error.value = '';
    if (mounted && route.name === 'movie-discover' && user.user.isLoged) void initialize();
  },
  { flush: 'sync' },
);
onBeforeUnmount(() => clearTimeout(debounce));
onMounted(() => {
  mounted = true;
  void initialize();
});
async function initialize() {
  await Promise.all([loadMovies(false), loadWatchlists(), loadGenres()]);
}
async function loadWatchlists() {
  const current = requests.begin('watchlists');
  try {
    const result = await MovieWatchlistService.listWatchlists();
    if (current()) watchlists.value = result;
  } catch {
    if (current()) showError('Não foi possível carregar suas listas.');
  }
}
async function loadGenres() {
  const current = requests.begin('genres');
  loadingGenres.value = true;
  genreError.value = '';
  try {
    const result = await MovieService.getMoviesGenres();
    if (current()) genres.value = result;
  } catch {
    if (current()) genreError.value = 'Não foi possível carregar os gêneros.';
  } finally {
    if (current()) loadingGenres.value = false;
  }
}
async function requestMovies(requestedPage: number): Promise<MovieResultResponseTmdb> {
  if (related.value)
    return related.value.type === 'similar'
      ? KitService.getMoviesSimilar(related.value.id, requestedPage)
      : KitService.getMoviesRecommendations(related.value.id, requestedPage);
  if (activeSearch.value)
    return KitService.searchByName({ query: activeSearch.value, page: requestedPage });
  const releaseYear = year.value === '' ? undefined : Number(year.value);
  if (genreIds.value.length || releaseYear)
    return KitService.getMoviesDiscover(
      undefined,
      requestedPage,
      releaseYear,
      genreIds.value.join(',') || undefined,
    );
  switch (sort.value) {
    case 'playingNow':
      return KitService.getMoviesNowPlaying(requestedPage);
    case 'topRated':
      return KitService.getMoviesTopRated(requestedPage);
    case 'voteAverageAsc':
      return KitService.getMoviesDiscover('vote_average.asc', requestedPage);
    case 'upcoming':
      return KitService.getMoviesUpcoming(requestedPage);
    default:
      return KitService.getMoviesPopular(requestedPage);
  }
}
async function loadMovies(append: boolean) {
  if (!user.user.isLoged || (append && (loading.value || page.value >= lastPage.value))) return;
  const current = requests.begin('movies'),
    requestedPage = append ? page.value + 1 : 1;
  loading.value = true;
  error.value = '';
  if (!append) style.scrollToContainer(0, 0, 'smooth');
  try {
    const result = await requestMovies(requestedPage);
    if (!current()) return;
    movies.value = append
      ? Array.from(
          new Map([...movies.value, ...result.results].map((movie) => [movie.id, movie])).values(),
        )
      : result.results;
    page.value = requestedPage;
    lastPage.value = Math.min(result.total_pages, 500);
  } catch {
    if (current())
      error.value =
        'O serviço de filmes está indisponível no momento. Sua busca não foi concluída. Tente novamente.';
  } finally {
    if (current()) loading.value = false;
  }
}
async function submitSearch() {
  const suggestion = suggestions.value[selectedSuggestion.value];
  if (suggestionsOpen.value && suggestion) searchText.value = suggestion.title;
  activeSearch.value = searchText.value.trim();
  related.value = null;
  genreIds.value = [];
  year.value = '';
  suggestionsOpen.value = false;
  await loadMovies(false);
}
async function chooseSuggestion(title: string) {
  searchText.value = title;
  selectedSuggestion.value = -1;
  await submitSearch();
}
function onSearchFocusOut(event: FocusEvent) {
  if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null))
    suggestionsOpen.value = false;
}
function moveSelection(step: number) {
  suggestionsOpen.value = true;
  selectedSuggestion.value = Math.max(
    -1,
    Math.min(suggestions.value.length - 1, selectedSuggestion.value + step),
  );
  document
    .getElementById(`movie-suggestion-${selectedSuggestion.value}`)
    ?.scrollIntoView({ block: 'nearest' });
}
async function applySort() {
  related.value = null;
  activeSearch.value = '';
  searchText.value = '';
  genreIds.value = [];
  year.value = '';
  suggestionsOpen.value = false;
  await loadMovies(false);
}
async function applyGenres() {
  if (
    year.value !== '' &&
    (!Number.isInteger(Number(year.value)) ||
      Number(year.value) < 1870 ||
      Number(year.value) > 9999)
  )
    return;
  related.value = null;
  activeSearch.value = '';
  searchText.value = '';
  await loadMovies(false);
}
async function resetSearch() {
  sort.value = 'popular';
  await applySort();
}
async function relatedMovies(value: { label: string; value: string }, id: number) {
  related.value = { id, type: value.value, label: value.label };
  activeSearch.value = '';
  searchText.value = '';
  genreIds.value = [];
  year.value = '';
  await loadMovies(false);
}
async function copyMovie(id: number) {
  const current = requests.begin('clipboard');
  try {
    await navigator.clipboard.writeText(`${window.location.origin}/movie/discover?movie=${id}`);
    if (current()) showSuccess('Link copiado.');
  } catch {
    if (current()) showError('Não foi possível copiar o link.');
  }
}
async function closeSummary() {
  if (route.name !== 'movie-discover') return;
  if (route.query.movie) {
    const query = { ...route.query };
    delete query.movie;
    await router.replace({ path: route.path, query });
  }
}
async function addMovieToWatchlist(id: string, movieId: number) {
  const list = watchlists.value.find((list) => list.id === id);
  if (
    adding.value ||
    !user.user.isLoged ||
    !list ||
    list.user.id !== user.user.id ||
    list.movies_wishlists.length >= 100 ||
    list.movies_wishlists.some((movie) => movie.tmdb_id === movieId)
  )
    return;
  const current = requests.begin('watchlist-mutation');
  adding.value = true;
  try {
    const result = await MovieWatchlistService.addMovieToWatchlist(id, movieId);
    if (!current()) return;
    watchlists.value = watchlists.value.map((list) => (list.id === id ? result : list));
    showSuccess('Filme adicionado à lista.');
  } catch {
    if (current()) showError('Não foi possível adicionar o filme.');
  } finally {
    if (current()) adding.value = false;
  }
}
</script>
<style scoped>
.mm-discover-header {
  padding: 0.25rem 0 1.25rem;
}
.mm-eyebrow {
  margin: 0 0 0.4rem;
  font-size: 0.7rem;
  color: var(--mm-link);
  text-transform: uppercase;
  letter-spacing: 0.13em;
}
.mm-discover-header h1 {
  font-size: clamp(1.7rem, 2.5vw, 2.35rem);
  line-height: 1.15;
  letter-spacing: -0.035em;
  margin: 0 0 0.45rem;
}
.mm-discover-header h1 span {
  color: var(--mm-link);
}
.mm-discover-header > p:last-child {
  color: var(--mm-muted);
  font-size: 0.9rem;
  margin: 0;
}
.mm-autocomplete {
  position: relative;
  min-width: 0;
}
.mm-autocomplete input,
.mm-discover-year input {
  width: 100%;
  min-width: 0;
  min-height: 44px;
  border: 1px solid var(--mm-border);
  border-radius: 10px;
  padding: 0.65rem 0.8rem;
  background: var(--mm-surface);
  color: var(--mm-text);
  font: inherit;
  font-size: 0.85rem;
}
.mm-autocomplete input {
  padding-inline: 0.8rem;
}
.mm-discover-year {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--mm-muted);
}
.mm-discover-clear {
  min-height: 44px;
  padding: 0.5rem 0.35rem;
  color: var(--mm-muted);
  font-size: 0.8rem;
  white-space: nowrap;
}
.mm-discover-clear:hover {
  color: var(--mm-text);
}
.mm-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 40;
  max-height: min(350px, 45dvh);
  overflow-y: auto;
  overscroll-behavior: contain;
  background: var(--mm-surface);
  border: 1px solid var(--mm-border);
  border-radius: 12px;
  padding: 0.5rem;
  list-style: none;
  box-shadow: 0 15px 40px #0003;
}
.mm-suggestions button {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  text-align: left;
  width: 100%;
  min-height: 44px;
  padding: 0.7rem;
  color: var(--mm-text);
  border-radius: 7px;
}
.mm-suggestions button:hover,
.mm-selected {
  background: var(--mm-raised);
}
.mm-suggestions span {
  color: var(--mm-muted);
}
.mm-results-title {
  font-size: 1.05rem;
  margin: 0 0 1rem;
}
.mm-discover-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 1.5rem 1.2rem;
}
.mm-status,
.mm-load-more {
  padding: 1.5rem;
  text-align: center;
  color: var(--mm-muted);
}
.mm-summary-watchlists summary {
  cursor: pointer;
}
.mm-summary-watchlists {
  font-size: 0.8rem;
}
.mm-discover-skeleton > div {
  aspect-ratio: 2/3;
  border-radius: 16px;
  background: var(--mm-raised);
}
.mm-discover-skeleton > span {
  display: block;
  height: 0.8rem;
  margin-top: 0.75rem;
  width: 80%;
  border-radius: 4px;
  background: var(--mm-raised);
}
.mm-discover-skeleton > span:last-child {
  width: 35%;
  height: 0.65rem;
}
.mm-discover-skeleton {
  animation: mm-discover-pulse 1.4s ease-in-out infinite alternate;
}
@keyframes mm-discover-pulse {
  to {
    opacity: 0.45;
  }
}
.mm-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}
@media (max-width: 700px) {
  .mm-discover-header {
    padding-bottom: 1rem;
  }
  .mm-discover-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.25rem 0.9rem;
  }
}
@media (prefers-reduced-motion: reduce) {
  .mm-discover-skeleton {
    animation: none;
  }
}
</style>
