<template>
  <BaseContainerMain class="mm-film-detail">
    <template v-if="loading"
      ><nav class="mm-movie-loading-actions" aria-label="Navegação do filme">
        <router-link class="mm-button" to="/home">← Coleção</router-link>
      </nav>
      <MoviePageSkeleton
    /></template>
    <div v-else-if="error" role="alert" class="mm-empty">
      <p>{{ error }}</p>
      <button class="mm-button" @click="loadMovie">Tentar novamente</button>
    </div>
    <template v-else-if="ready && movie.id === movieId"
      ><MovieSuperiorButtons :show-edit-btn="canEdit" show-refresh-btn /><MovieForm
        readonly /><MovieTableNotes :movie-id="movieId" /><MovieVideoEmbedded width="100%"
    /></template>
  </BaseContainerMain>
</template>
<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useHead } from '#imports';
import MoviePageSkeleton from '../components/MoviePageSkeleton.vue';
import BaseContainerMain from 'src/core/components/BaseContainerMain.vue';
import MovieSuperiorButtons from '../components/MovieSuperiorButtons.vue';
import MovieForm from '../components/MovieForm.vue';
import MovieTableNotes from '../components/MovieTableNotes.vue';
import MovieVideoEmbedded from '../components/MovieVideoEmbedded.vue';
import { useMovieStore } from '../stores/MovieStore';
import { useUserStore } from 'src/core/stores/UserStore';
import { useMovieRequests } from '../composables/useMovieRequests';
import MovieService from '../services/MovieService';
const route = useRoute(),
  store = useMovieStore(),
  user = useUserStore(),
  requests = useMovieRequests();
const movieId = computed(() => route.params.id?.toString() || ''),
  movie = computed(() => store.moviePage.selectedMovie);
const loading = ref(true),
  ready = ref(false),
  error = ref('');
const canEdit = computed(
  () => user.user.isLoged && (user.isAdmin || user.user.id === movie.value.user_id),
);
let mounted = false;
useHead(() => ({
  title: `Movie Mux - ${ready.value ? movie.value.portuguese_title || 'Filme' : 'Filme'}`,
}));
onMounted(() => {
  mounted = true;
  void loadMovie();
});
watch(
  requests.context,
  () => {
    ready.value = false;
    error.value = '';
    if (mounted && route.name === 'movie') void loadMovie();
  },
  { flush: 'sync' },
);
async function loadMovie() {
  ready.value = false;
  error.value = '';
  if (!movieId.value || !user.user.isLoged) {
    loading.value = false;
    return;
  }
  const current = requests.begin('load'),
    id = movieId.value;
  loading.value = true;
  try {
    const result = await MovieService.getMovie(id);
    if (!current()) return;
    store.moviePage.selectedMovie = result;
    ready.value = true;
  } catch {
    if (current()) error.value = 'Não foi possível carregar o filme.';
  } finally {
    if (current()) loading.value = false;
  }
}
</script>

<style scoped>
.mm-movie-loading-actions {
  display: flex;
  align-items: stretch;
  min-height: 46px;
  margin-bottom: 2rem;
}

.mm-film-detail.mm-container {
  max-width: 70rem;
}
.mm-film-detail :deep(.mm-synopsis) {
  max-width: 70ch;
}
@media (min-width: 751px) {
  .mm-film-detail :deep(.mm-movie-readonly) {
    grid-template-columns: minmax(180px, 280px) minmax(0, 1fr);
    gap: clamp(1.5rem, 3vw, 2.5rem);
  }
}
</style>
