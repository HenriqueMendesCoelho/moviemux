<template>
  <section class="mm-section">
    <header class="mm-section-header">
      <div>
        <span class="mm-eyebrow">Seu cinema, sua comunidade</span>
        <h2>
          Todos os filmes <small>{{ totalNumberOfMovies }}</small>
        </h2>
      </div>
      <router-link class="mm-button mm-button-primary" :to="{ name: 'add' }"
        >+ Adicionar filme</router-link
      >
    </header>
    <form class="mm-filter-bar" @submit.prevent="searchFromIndexMenu">
      <div class="mm-search-field">
        <label for="library-search">Buscar na coleção</label
        ><input
          id="library-search"
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
      <label
        >Ordenar<select v-model="orderOption" @change="search">
          <option value="">Padrão</option>
          <option v-for="option in orderOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select></label
      >
      <details class="mm-genre-picker">
        <summary>
          Gêneros
          <span>{{
            genresSelected.length ? `${genresSelected.length} selecionados` : 'Todos'
          }}</span
          ><span aria-hidden="true">⌄</span>
        </summary>
        <div class="mm-genre-options">
          <label v-for="genre in genresOptions" :key="genre.id"
            ><input v-model="genresSelected" type="checkbox" :value="genre.id" @change="search" />{{
              genre.name
            }}</label
          >
          <p v-if="!genresOptions.length" class="mm-muted">Nenhum gênero disponível.</p>
        </div>
      </details>
      <button class="mm-button mm-button-primary" :disabled="loading">Buscar</button
      ><button type="button" class="mm-button" @click="refreshSearch">Limpar</button>
    </form>
    <p v-if="error" role="alert" class="mm-error">
      {{ error }} <button class="mm-button" @click="search">Tentar novamente</button>
    </p>
    <div class="mm-poster-grid">
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
    <MovieHomeFloatingActionButton />
  </section>
</template>
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import type Movie from 'src/core/domain/movie/movie';
import MovieService from 'src/modules/movie/services/MovieService';
import MovieHomeFloatingActionButton from './MovieHomeFloatingActionButton.vue';
import MovieHomeCardImageGrid from './MovieHomeCardImageGrid.vue';
import { useUserStore } from 'src/core/stores/UserStore';
import { showError } from 'src/core/utils/NotificationUtils';
const userStore = useUserStore();
const movies = ref<Movie[]>([]);
const moviesWhenTyping = ref<Movie[]>([]);
const totalNumberOfMovies = ref(0);
const searchText = ref('');
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
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting) && !error.value) void loadMore();
    },
    { rootMargin: '200px' },
  );
  if (loadTarget.value) observer.observe(loadTarget.value);
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
  if (disposed || !userStore.user.isLoged || loading.value || page.value > totalPages.value) return;
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
    if (current()) loading.value = false;
  }
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
.mm-poster-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 28px 20px;
}
.mm-search-field {
  position: relative;
  flex: 1;
  min-width: 180px;
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
.mm-filter-bar {
  display: flex;
  align-items: end;
  gap: 12px;
  flex-wrap: wrap;
  margin: 24px 0;
}
.mm-filter-bar label {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-width: 0;
  gap: 8px;
}
.mm-filter-bar select {
  width: 100%;
  min-width: 0;
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
  .mm-filter-bar > label {
    flex: 1;
    min-width: 130px;
  }
}
</style>
