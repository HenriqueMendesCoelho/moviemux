<template>
  <BaseContainerMain>
    <header class="mm-discover-header">
      <p class="mm-eyebrow">Uma nova história começa aqui</p>
      <h1>Explore o cinema<span>.</span></h1>
      <p>Grandes estreias, favoritos e aquela próxima descoberta.</p>
    </header>
    <form class="mm-discover-toolbar" @submit.prevent="submitSearch">
      <div class="mm-autocomplete" @focusout="onSearchFocusOut">
        <label class="mm-sr-only" for="discover-search">Pesquisar filme</label
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
      <label class="mm-sort"
        >Mostrar<select v-model="sort" @change="applySort">
          <option value="popular">Populares</option>
          <option value="playingNow">Nos cinemas</option>
          <option value="topRated">Melhores avaliações</option>
          <option value="voteAverageAsc">Menores avaliações</option>
          <option value="upcoming">Em breve</option>
        </select></label
      >
      <button type="submit" class="mm-button mm-button-primary" :disabled="loading">Buscar</button
      ><button type="button" class="mm-button" @click="resetSearch">Limpar</button>
    </form>
    <label class="mm-discover-year"
      >Ano de lançamento
      <input
        v-model="year"
        type="number"
        min="1870"
        max="9999"
        placeholder="Todos os anos"
        @change="applyGenres"
    /></label>
    <details class="mm-genres-filter">
      <summary>
        Filtrar por gênero <span v-if="genreIds.length">({{ genreIds.length }})</span>
      </summary>
      <div>
        <label v-for="genre in genres" :key="genre.id"
          ><input
            v-model="genreIds"
            type="checkbox"
            :value="genre.tmdb_id"
            @change="applyGenres"
          />{{ genre.name }}</label
        ><span v-if="loadingGenres" role="status">Carregando gêneros…</span>
      </div>
    </details>
    <h2 class="mm-results-title">{{ collectionTitle }}</h2>
    <p v-if="error" role="alert" class="mm-error">
      {{ error }}
      <button type="button" class="mm-button" @click="loadMovies(false)">Tentar novamente</button>
    </p>
    <div class="mm-discover-grid" :aria-busy="loading">
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
    <BaseDialogFormMovieSummary v-model="showSummary" :movie-id="summaryId" @hide="closeSummary"
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
  loadingGenres = ref(false);
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
  try {
    const result = await MovieService.getMoviesGenres();
    if (current()) genres.value = result;
  } catch {
    if (current()) showError('Não foi possível carregar gêneros.');
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
    if (current()) error.value = 'Não foi possível carregar os filmes.';
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
.mm-discover-year {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  font-size: 0.85rem;
  margin-top: 1rem;
  flex-wrap: wrap;
}
.mm-discover-year input {
  color: inherit;
  background: var(--grey-dark2);
  border: 1px solid var(--mm-border);
  border-radius: 8px;
  padding: 0.6rem;
  width: 130px;
}
.mm-discover-header {
  padding: 1rem 0 2rem;
}
.mm-eyebrow {
  font-size: 0.7rem;
  color: var(--primary);
  text-transform: uppercase;
  letter-spacing: 0.18em;
}
.mm-discover-header h1 {
  font-size: clamp(2.2rem, 4vw, 3.8rem);
  line-height: 1.1;
  letter-spacing: -0.045em;
  margin: 0.6rem 0 1rem;
}
.mm-discover-header h1 span {
  color: var(--primary);
}
.mm-discover-header > p:last-child {
  opacity: 0.55;
}
.mm-discover-toolbar {
  display: flex;
  align-items: end;
  gap: 0.8rem;
  padding: 1rem;
  background: var(--grey-dark2);
  border: 1px solid #8883;
  border-radius: 16px;
}
.mm-autocomplete {
  position: relative;
  flex: 1;
}
.mm-autocomplete input,
.mm-sort select {
  width: 100%;
  border: 1px solid #8884;
  border-radius: 10px;
  padding: 0.85rem;
  background: var(--grey-dark);
  color: inherit;
  font: inherit;
}
.mm-sort {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.7rem;
}
.mm-sort select {
  font-size: 0.85rem;
  padding: 0.8rem;
}
.mm-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 20;
  background: var(--grey-dark2);
  border: 1px solid #8884;
  border-radius: 12px;
  padding: 0.5rem;
  list-style: none;
  box-shadow: 0 15px 40px #0004;
}
.mm-suggestions button {
  display: flex;
  justify-content: space-between;
  text-align: left;
  width: 100%;
  padding: 0.8rem;
  color: inherit;
  border-radius: 7px;
}
.mm-suggestions button:hover,
.mm-selected {
  background: var(--grey-mid);
}
.mm-suggestions span {
  opacity: 0.4;
  margin-left: 0.5rem;
}
.mm-genres-filter {
  font-size: 0.8rem;
  margin: 1rem 0 2rem;
}
.mm-genres-filter summary {
  cursor: pointer;
  opacity: 0.75;
}
.mm-genres-filter > div {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 1rem 0;
}
.mm-genres-filter label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.mm-results-title {
  font-size: 1.15rem;
  margin: 0 0 1.5rem;
}
.mm-discover-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 2rem 1.4rem;
}
.mm-status,
.mm-load-more {
  padding: 2rem;
  text-align: center;
}
.mm-summary-watchlists summary {
  cursor: pointer;
}
.mm-summary-watchlists {
  font-size: 0.8rem;
}
.mm-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}
@media (max-width: 700px) {
  .mm-discover-toolbar {
    flex-wrap: wrap;
  }
  .mm-autocomplete {
    flex-basis: 100%;
  }
  .mm-sort {
    flex: 1;
  }
  .mm-discover-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.5rem 1rem;
  }
}
</style>
