<template>
  <section class="mm-section">
    <header class="mm-section-header">
      <div>
        <span class="mm-eyebrow">Seu cinema, sua comunidade</span>
        <h2>
          Todos os filmes <small>{{ totalNumberOfMovies }}</small>
        </h2>
      </div>
    </header>
    <form
      class="mm-filter-bar mm-browse-toolbar mm-browse-toolbar-home"
      @submit.prevent="searchFromIndexMenu"
    >
      <div class="mm-search-field">
        <label for="library-search">Buscar na coleção</label
        ><input
          id="library-search"
          ref="searchInput"
          :class="{ 'mm-search-has-value': searchText.length > 0 }"
          v-model="searchText"
          placeholder="Título do filme…"
          autocomplete="off"
          role="combobox"
          :aria-expanded="showMenu"
          aria-controls="library-suggestions"
          @focus="menuIsFocused = true"
          @blur="menuIsFocused = false"
          @keydown.down.prevent="moveSelection(1)"
          @keydown.up.prevent="moveSelection(-1)"
          @keydown.esc="menuIsFocused = false"
        />
        <button
          v-if="searchText.length > 0"
          type="button"
          class="mm-search-clear"
          aria-label="Limpar busca"
          title="Limpar busca"
          @click="clearSearch"
        >
          <BaseIcon name="close" />
        </button>
        <button
          class="mm-search-submit"
          aria-label="Buscar na coleção"
          title="Buscar"
          :disabled="loading"
        >
          <BaseIcon name="search" />
        </button>
        <ul v-if="showMenu" id="library-suggestions" class="mm-suggestions" role="listbox">
          <li
            v-for="(movie, index) in moviesWhenTyping"
            :key="movie.id"
            role="option"
            :aria-selected="selectedIndexMenu === index"
          >
            <button
              type="button"
              :class="{ 'mm-selected': selectedIndexMenu === index }"
              @mousedown.prevent
              @click="chooseTitle(movie.portuguese_title)"
            >
              {{ movie.portuguese_title }}
            </button>
          </li>
        </ul>
      </div>
      <BaseSelect
        v-model="orderOption"
        label="Ordenar"
        :options="[{ value: '', label: 'Padrão' }, ...orderOptions]"
        @change="search"
      />
      <BaseMultiSelect
        v-model="genresSelected"
        label="Gêneros"
        placeholder="Todos os gêneros"
        :options="genresOptions.map((genre) => ({ value: genre.id, label: genre.name }))"
        @change="search"
      />
      <button type="button" class="mm-clear-filters" @click="refreshSearch">Limpar filtros</button>
    </form>
    <p v-if="error" role="alert" class="mm-error">
      {{ error }} <button class="mm-button" @click="search">Tentar novamente</button>
    </p>
    <div class="mm-poster-grid" :aria-busy="loading">
      <template v-if="loading && !movies.length"
        ><div
          v-for="index in 8"
          :key="`skeleton-${index}`"
          class="mm-poster-skeleton"
          aria-hidden="true"
      /></template>
      <MovieHomeCardImageGrid v-for="movie in movies" :key="movie.id" :movie="movie" />
    </div>
    <p v-if="!loading && !error && !movies.length" class="mm-empty">
      Nenhum filme encontrado. Experimente outro título ou gênero.
    </p>
    <div ref="loadTarget" class="mm-load-more">
      <button v-if="page <= totalPages" class="mm-button" :disabled="loading" @click="loadMore">
        {{ loading ? 'Carregando…' : 'Carregar mais filmes' }}</button
      ><span v-else-if="loading" role="status">Carregando…</span>
    </div>
  </section>
</template>
<script setup lang="ts">
import {
  computed,
  onMounted,
  onUnmounted,
  onActivated,
  onDeactivated,
  nextTick,
  ref,
  watch,
} from 'vue';
import type Movie from 'src/core/domain/movie/movie';
import MovieService from 'src/modules/movie/services/MovieService';
import 'src/core/ui/filter-toolbar.css';
import BaseSelect from 'src/core/components/BaseSelect.vue';
import BaseMultiSelect from 'src/core/components/BaseMultiSelect.vue';
import { stateSocketAllMovies } from 'src/boot/socket';
import BaseIcon from 'src/core/components/BaseIcon.vue';
import MovieHomeCardImageGrid from './MovieHomeCardImageGrid.vue';
import { useUserStore } from 'src/core/stores/UserStore';
import { showError } from 'src/core/utils/NotificationUtils';
const userStore = useUserStore();
const movies = ref<Movie[]>([]);
const moviesWhenTyping = ref<Movie[]>([]);
const totalNumberOfMovies = ref(0);
const searchText = ref('');
const searchInput = ref<HTMLInputElement>();
const orderOption = ref('');
const genresSelected = ref<number[]>([]);
const genresOptions = ref<{ id: number; name: string; tmdb_id: number }[]>([]);
const loading = ref(false);
const error = ref('');
const page = ref(1);
const totalPages = ref(1);
const menuIsFocused = ref(false);
const selectedIndexMenu = ref(-1);
const showMenu = computed(
  () => menuIsFocused.value && !!searchText.value && !!moviesWhenTyping.value.length,
);
const loadTarget = ref<HTMLElement>();
let observer: IntersectionObserver | undefined;
let disposed = false;
let active = true;
let initialized = false;
let catalogDirty = false;
function observeMore() {
  observer?.disconnect();
  if (!active || !initialized || !loadTarget.value || typeof IntersectionObserver === 'undefined')
    return;
  observer = new IntersectionObserver(
    (entries) => {
      if (active && entries.some((entry) => entry.isIntersecting) && !error.value) void loadMore();
    },
    { rootMargin: '200px' },
  );
  observer.observe(loadTarget.value);
}
onActivated(async () => {
  active = true;
  await nextTick();
  observeMore();
  if (initialized && catalogDirty) void refreshRetainedPages();
});
onDeactivated(() => {
  active = false;
  observer?.disconnect();
  menuIsFocused.value = false;
  clearTimeout(searchTimer);
  suggestionVersion++;
});
watch(
  () => stateSocketAllMovies.updateEvents.length,
  () => {
    catalogDirty = true;
    if (active && initialized) void refreshRetainedPages();
  },
);
async function refreshRetainedPages() {
  if (!active || disposed || loading.value || !userStore.user.isLoged) return;
  const version = ++requestVersion;
  const session = userStore.user;
  const loadedPages = Math.max(1, page.value - 1);
  loading.value = true;
  catalogDirty = false;
  try {
    const results = [];
    for (let index = 0; index < loadedPages; index++) {
      const result = await MovieService.listMoviesPageable({
        ...appliedFilters,
        page: index + 1,
        size: 30,
      });
      if (disposed || version !== requestVersion || session !== userStore.user) return;
      results.push(result);
      if (index + 1 >= result.total_pages) break;
    }
    if (disposed || version !== requestVersion || session !== userStore.user) return;
    const seen = new Set<string | undefined>();
    movies.value = results
      .flatMap((result) => result.content)
      .filter((movie) => {
        if (seen.has(movie.id)) return false;
        seen.add(movie.id);
        return true;
      });
    totalPages.value = results[0]?.total_pages || 0;
    totalNumberOfMovies.value = results[0]?.total_elements || 0;
    page.value = Math.min(loadedPages, totalPages.value) + 1;
  } catch {
    if (!disposed && version === requestVersion)
      error.value = 'Não foi possível atualizar a coleção. Seus filmes continuam disponíveis.';
  } finally {
    if (!disposed && version === requestVersion) {
      loading.value = false;
      if (active && catalogDirty) void refreshRetainedPages();
    }
  }
}
let requestVersion = 0;
let appliedFilters: { title: string; sort?: string; withGenres?: string } = { title: '' };
let suggestionVersion = 0;
let searchTimer: ReturnType<typeof setTimeout> | undefined;
const orderOptions = [
  { label: 'Título (A–Z)', value: 'portugueseTitle,asc' },
  { label: 'Título (Z–A)', value: 'portugueseTitle,desc' },
  { label: 'Lançamento: mais novo', value: 'releaseDate,portugueseTitle,desc' },
  { label: 'Lançamento: mais antigo', value: 'releaseDate,portugueseTitle,asc' },
  { label: 'Nota: maior', value: 'portugueseTitle,asc&sortJoin=notes,desc' },
  { label: 'Nota: menor', value: 'portugueseTitle,asc&sortJoin=notes,asc' },
  { label: 'Cadastro: mais novo', value: 'createdAt,portugueseTitle,desc' },
  { label: 'Cadastro: mais antigo', value: 'createdAt,portugueseTitle,asc' },
  { label: 'Duração: maior', value: 'runtime,desc' },
  { label: 'Duração: menor', value: 'runtime,asc' },
];
onMounted(async () => {
  try {
    genresOptions.value = await MovieService.getMoviesGenresWithMovies();
  } catch {
    if (!disposed) showError('Erro ao carregar gêneros');
  }
  if (disposed) return;
  await search();
  if (disposed) return;
  initialized = true;
  observeMore();
  if (catalogDirty) void refreshRetainedPages();
});
onUnmounted(() => {
  disposed = true;
  observer?.disconnect();
  clearTimeout(searchTimer);
  requestVersion++;
  suggestionVersion++;
});
watch(
  () => userStore.user.id,
  () => {
    requestVersion++;
    suggestionVersion++;
    clearTimeout(searchTimer);
    movies.value = [];
    moviesWhenTyping.value = [];
    loading.value = false;
    if (userStore.user.isLoged && !disposed) void search();
  },
);
watch(searchText, (value) => {
  clearTimeout(searchTimer);
  selectedIndexMenu.value = -1;
  const version = ++suggestionVersion;
  const session = userStore.user;
  if (!value.trim()) {
    moviesWhenTyping.value = [];
    return;
  }
  searchTimer = setTimeout(async () => {
    if (
      disposed ||
      version !== suggestionVersion ||
      userStore.user !== session ||
      !userStore.user.isLoged
    )
      return;
    try {
      const result = await MovieService.listMoviesPageable({ title: value, page: 1, size: 8 });
      if (
        !disposed &&
        version === suggestionVersion &&
        userStore.user === session &&
        userStore.user.isLoged
      )
        moviesWhenTyping.value = result.content;
    } catch {
      if (
        !disposed &&
        version === suggestionVersion &&
        userStore.user === session &&
        userStore.user.isLoged
      )
        moviesWhenTyping.value = [];
    }
  }, 250);
});
async function search() {
  if (disposed || !userStore.user.isLoged) return;
  const nextFilters = {
    title: searchText.value,
    sort: orderOption.value || undefined,
    withGenres: genresSelected.value.join(',') || undefined,
  };
  if (
    loading.value &&
    page.value === 1 &&
    nextFilters.title === appliedFilters.title &&
    nextFilters.sort === appliedFilters.sort &&
    nextFilters.withGenres === appliedFilters.withGenres
  )
    return;
  appliedFilters = nextFilters;
  page.value = 1;
  totalPages.value = 1;
  movies.value = [];
  requestVersion++;
  loading.value = false;
  await loadMore();
}
async function loadMore() {
  if (
    !active ||
    disposed ||
    !userStore.user.isLoged ||
    loading.value ||
    page.value > totalPages.value
  )
    return;
  const version = requestVersion;
  const session = userStore.user;
  const current = () =>
    !disposed && version === requestVersion && session === userStore.user && userStore.user.isLoged;
  loading.value = true;
  error.value = '';
  try {
    const result = await MovieService.listMoviesPageable({
      ...appliedFilters,
      page: page.value,
      size: 30,
    });
    if (!current()) return;
    const seen = new Set(movies.value.map((movie) => movie.id));
    movies.value.push(
      ...result.content.filter((movie) => {
        if (seen.has(movie.id)) return false;
        seen.add(movie.id);
        return true;
      }),
    );
    totalPages.value = result.total_pages;
    totalNumberOfMovies.value = result.total_elements;
    page.value++;
  } catch {
    if (current()) error.value = 'Não foi possível carregar os filmes.';
  } finally {
    if (current()) {
      loading.value = false;
      if (active && initialized && catalogDirty) void refreshRetainedPages();
    }
  }
}
function clearSearch() {
  clearTimeout(searchTimer);
  suggestionVersion++;
  moviesWhenTyping.value = [];
  selectedIndexMenu.value = -1;
  menuIsFocused.value = false;
  searchText.value = '';
  void search();
  searchInput.value?.focus();
}
async function refreshSearch() {
  searchText.value = '';
  orderOption.value = '';
  genresSelected.value = [];
  await search();
}
function moveSelection(step: number) {
  menuIsFocused.value = true;
  selectedIndexMenu.value = Math.max(
    0,
    Math.min(moviesWhenTyping.value.length - 1, selectedIndexMenu.value + step),
  );
}
async function chooseTitle(title?: string) {
  if (title) searchText.value = title;
  menuIsFocused.value = false;
  await search();
}
async function searchFromIndexMenu() {
  const selected = moviesWhenTyping.value[selectedIndexMenu.value];
  if (showMenu.value && selected) await chooseTitle(selected.portuguese_title);
  else await search();
}
</script>

<style scoped>
.mm-poster-skeleton {
  aspect-ratio: 2 / 3;
  border-radius: 14px;
  background: var(--mm-raised);
}
.mm-poster-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 28px 20px;
}
.mm-search-field {
  position: relative;
  min-width: 0;
}
.mm-suggestions {
  position: absolute;
  inset: 100% 0 auto;
  z-index: 30;
  list-style: none;
  padding: 8px;
  background: var(--grey-dark2);
  border: 1px solid var(--grey-mid2);
  border-radius: 12px;
  max-height: 280px;
  overflow: auto;
}
.mm-suggestions button {
  padding: 10px;
  width: 100%;
  text-align: left;
  color: inherit;
  border-radius: 8px;
}
.mm-suggestions button:hover,
.mm-selected {
  background: var(--grey-mid);
}
.mm-load-more {
  text-align: center;
  padding: 24px;
}
.mm-section-header small {
  font-size: 0.55em;
  opacity: 0.6;
}
@media (max-width: 600px) {
  .mm-poster-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px 12px;
  }
}
.mm-search-field input {
  width: 100%;
  min-height: 44px;
  border: 1px solid var(--mm-border);
  border-radius: 10px;
  padding: 0.65rem 48px 0.65rem 0.8rem;
  background: var(--mm-surface);
  color: var(--mm-text);
  font: inherit;
  font-size: 0.85rem;
}
.mm-search-field > label {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--mm-muted);
}
.mm-search-field input.mm-search-has-value {
  padding-right: 92px;
}
.mm-search-clear,
.mm-search-submit {
  position: absolute;
  right: 1px;
  bottom: 1px;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--mm-text);
  cursor: pointer;
}
.mm-search-clear {
  right: 45px;
  color: var(--mm-muted);
}
.mm-search-clear:hover,
.mm-search-submit:hover {
  background: var(--grey-mid);
}
.mm-clear-filters {
  min-height: 44px;
  border: 0;
  background: transparent;
  color: var(--mm-muted);
  white-space: nowrap;
  font-size: 0.8rem;
  cursor: pointer;
  padding: 8px;
}
</style>
