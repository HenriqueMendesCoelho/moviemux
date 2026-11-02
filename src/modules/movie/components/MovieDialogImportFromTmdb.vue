<template>
  <BaseModal v-model="visible" title="Importar do TMDB" wide>
    <p class="mm-muted">Encontre um filme e traga os detalhes para sua coleção.</p>
    <form class="mm-import-search" @submit.prevent="firstSearch">
      <label class="mm-sr-only" for="tmdb-search">Título do filme</label
      ><input
        id="tmdb-search"
        v-model="text"
        type="search"
        placeholder="Qual filme você quer adicionar?"
        required
      /><button class="mm-button mm-button-primary" :disabled="loading || importing">
        Pesquisar</button
      ><button type="button" class="mm-button" :disabled="importing" @click="resetSearch">
        Limpar
      </button>
    </form>
    <p v-if="importing" role="status">Importando filme…</p>
    <p v-if="loading" role="status">Buscando filmes…</p>
    <p v-if="error" role="alert">
      {{ error }}
      <button type="button" class="mm-button" @click="firstSearch">Tentar novamente</button>
    </p>
    <div class="mm-import-grid">
      <button
        v-for="movie in movies"
        :key="movie.id"
        type="button"
        class="mm-import-card"
        :disabled="importing"
        @click="showConfirmDialog(movie)"
      >
        <img
          v-if="movie.poster_path"
          :src="getImageUrl(movie.poster_path)"
          :alt="movie.title"
          loading="lazy"
        />
        <div v-else class="mm-import-placeholder">Sem cartaz</div>
        <strong>{{ movie.title }}</strong
        ><span>{{ movie.release_date?.slice(0, 4) }}</span>
      </button>
    </div>
    <p v-if="searched && !loading && !error && !movies.length">
      Nenhum filme encontrado. Tente outro título.
    </p>
    <div ref="sentinel" aria-hidden="true" />
    <button
      v-if="page < totalPages && movies.length"
      type="button"
      class="mm-button"
      :disabled="loading || importing"
      @click="loadMore"
    >
      Carregar mais filmes
    </button>
    <BaseConfirmDialog ref="confirmDialogRef" @ok="importMovie" />
  </BaseModal>
</template>
<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useInfinitePaging } from '../composables/useInfinitePaging';
import { useRuntimeConfig } from '#imports';
import BaseModal from 'src/core/components/BaseModal.vue';
import BaseConfirmDialog from 'src/core/components/BaseConfirmDialog.vue';
import type { MovieResultResponseTmdb } from 'src/core/types/movie/MovieType';
import { useMovieStore } from '../stores/MovieStore';
import { useUserStore } from 'src/core/stores/UserStore';
import { useMovieContext } from '../composables/useMovieContext';
import { useMovieRequests } from '../composables/useMovieRequests';
import { tmdbImageUrl } from '../utils/MovieStateUtils';
import Movie from 'src/core/domain/movie/movie';
import MovieService from '../services/MovieService';
import KitService from 'src/core/services/KitService';
import { showError, showSuccess } from 'src/core/utils/NotificationUtils';
const visible = defineModel<boolean>({ default: false });
const store = useMovieStore(),
  user = useUserStore(),
  draft = useMovieContext(),
  requests = useMovieRequests(),
  config = useRuntimeConfig();
const confirmDialogRef = ref<InstanceType<typeof BaseConfirmDialog>>();
const text = ref(''),
  page = ref(1),
  totalPages = ref(0),
  loading = ref(false),
  importing = ref(false),
  searched = ref(false),
  error = ref('');
const movies = ref<MovieResultResponseTmdb['results']>([]);
const sentinel = ref<HTMLElement>();
useInfinitePaging(
  sentinel,
  computed(
    () =>
      visible.value &&
      !loading.value &&
      !importing.value &&
      !error.value &&
      movies.value.length > 0 &&
      page.value < totalPages.value,
  ),
  loadMore,
);
let movieId = 0,
  confirmed = () => false;
watch(visible, () => {
  requests.invalidate();
  resetSearch();
  importing.value = false;
});
watch(
  requests.context,
  () => {
    visible.value = false;
    resetSearch();
    importing.value = false;
  },
  { flush: 'sync' },
);
function resetSearch() {
  if (importing.value) return;
  requests.invalidate();
  text.value = '';
  movies.value = [];
  page.value = 1;
  totalPages.value = 0;
  searched.value = false;
  loading.value = false;
  error.value = '';
}
async function search(append = false) {
  if (!visible.value || !user.user.isLoged || importing.value || !text.value.trim()) return;
  const current = requests.begin('search'),
    requestedPage = append ? page.value + 1 : 1;
  loading.value = true;
  error.value = '';
  searched.value = true;
  try {
    const result = await KitService.searchByName({ query: text.value.trim(), page: requestedPage });
    if (!current() || !visible.value) return;
    movies.value = append ? [...movies.value, ...result.results] : result.results;
    page.value = requestedPage;
    totalPages.value = Math.min(500, result.total_pages);
  } catch {
    if (current()) error.value = 'Não foi possível buscar filmes.';
  } finally {
    if (current()) loading.value = false;
  }
}
async function firstSearch() {
  await search();
}
async function loadMore() {
  if (!loading.value && page.value < totalPages.value) await search(true);
}
function getImageUrl(path?: string) {
  return tmdbImageUrl(config.public.tmdbImageBase, path);
}
function showConfirmDialog(movie: MovieResultResponseTmdb['results'][number]) {
  if (importing.value) return;
  movieId = movie.id;
  confirmed = requests.begin('confirm');
  confirmDialogRef.value?.show({
    title: 'Importar filme',
    message: `Importar “${movie.title}”? Os campos atuais serão substituídos.`,
    focus: 'cancel',
    ok: 'Importar',
  });
}
async function importMovie() {
  if (importing.value || !visible.value || !confirmed() || !user.user.isLoged) return;
  const current = requests.begin('import'),
    target = movieId;
  importing.value = true;
  try {
    const [res, genres] = await Promise.all([
      KitService.summary({ tmdb_id: target }),
      store.moviePage.genres.length
        ? Promise.resolve(store.moviePage.genres)
        : MovieService.getMoviesGenres(),
    ]);
    if (!current() || !visible.value) return;
    store.moviePage.genres = genres;
    draft.value = new Movie(
      '',
      res.tmdb_id,
      res.imdb_id,
      res.portuguese_title,
      res.english_title,
      res.original_title,
      res.director,
      getImageUrl(res.url_image_portuguese || res.url_image_english),
      res.portuguese_url_trailer,
      res.english_url_trailer,
      res.description,
      genres.filter((g) => res.genres?.includes(g.name)),
      new Date(res.release_date || new Date()),
      res.runtime,
    );
    showSuccess('Filme importado. Revise os dados e salve.');
    visible.value = false;
  } catch {
    if (current()) showError('Erro ao importar filme.');
  } finally {
    if (current()) importing.value = false;
  }
}
</script>
<style scoped>
.mm-import-search {
  display: flex;
  gap: 0.6rem;
  margin: 1.5rem 0;
}
.mm-import-search input {
  flex: 1;
  min-width: 0;
  padding: 0.8rem;
  border: 1px solid #8885;
  border-radius: 12px;
  background: var(--grey-dark2);
  color: inherit;
}
.mm-import-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 1rem;
  margin: 1rem 0;
}
.mm-import-card {
  color: inherit;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border-radius: 12px;
  padding: 0.4rem;
}
.mm-import-card:hover {
  background: var(--grey-mid);
}
.mm-import-card img,
.mm-import-placeholder {
  width: 100%;
  aspect-ratio: 2/3;
  object-fit: cover;
  border-radius: 10px;
}
.mm-import-placeholder {
  background: var(--grey-mid);
  display: grid;
  place-items: center;
}
.mm-import-card span {
  opacity: 0.6;
}
.mm-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}
</style>
