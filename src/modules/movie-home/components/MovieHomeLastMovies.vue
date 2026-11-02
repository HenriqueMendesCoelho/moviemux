<template>
  <section class="mm-section" v-if="movies.length || loading || loadError">
    <header class="mm-section-header">
      <div>
        <span class="mm-eyebrow">Adicionados recentemente</span>
        <h2>Últimas sessões</h2>
      </div>
      <div class="mm-actions">
        <button
          class="mm-button"
          :aria-expanded="isVisibleLastFilms"
          @click="isVisibleLastFilms = !isVisibleLastFilms"
        >
          {{ isVisibleLastFilms ? 'Recolher' : 'Expandir' }}</button
        ><button class="mm-button" :disabled="loading" @click="loadLastMovies">Atualizar</button>
      </div>
    </header>
    <p v-if="loadError" role="alert">{{ loadError }}</p>
    <div v-show="isVisibleLastFilms" class="mm-recent-strip">
      <MovieHomeCardImageLastMovies
        v-for="movie in movies"
        :key="movie.id"
        :id="movie.id"
        :title="movie.portuguese_title"
        :url="movie.url_image"
      />
    </div>
  </section>
</template>

<script lang="ts" setup>
import { onActivated, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { useUserStore } from 'src/core/stores/UserStore';

import type Movie from 'src/core/domain/movie/movie';

import MovieHomeCardImageLastMovies from './MovieHomeCardImageLastMovies.vue';

import MovieService from 'src/modules/movie/services/MovieService';
import { socketAllMovies, stateSocketAllMovies } from 'src/boot/socket';

import { showError } from 'src/core/utils/NotificationUtils';

const userStore = useUserStore();
const isVisibleLastFilms = ref(true);
const movies = ref<Movie[]>([]);
const loading = ref(false);
const loadError = ref('');
let disposed = false;
let generation = 0;
let pendingRefresh = false;
onMounted(async () => {
  await loadLastMovies();
  if (disposed || !userStore.user.isLoged) return;
  if (!stateSocketAllMovies.connected) {
    stateSocketAllMovies.token = decodeURIComponent(
      document.cookie
        .split('; ')
        .find((item) => item.startsWith('auth-kb='))
        ?.slice(8) || '',
    );
    socketAllMovies.connect();
  }
});
onBeforeUnmount(() => {
  disposed = true;
  generation++;
  pendingRefresh = false;
});
onActivated(() => {
  if (stateSocketAllMovies.hasToExecuteUpdate) void loadLastMovies();
});
watch(
  () => stateSocketAllMovies.updateEvents.length,
  () => {
    if (stateSocketAllMovies.hasToExecuteUpdate) void loadLastMovies();
  },
);
watch(
  () => userStore.user.id,
  () => {
    generation++;
    movies.value = [];
    loading.value = false;
    pendingRefresh = false;
    if (userStore.user.isLoged) void loadLastMovies();
  },
);
async function loadLastMovies() {
  if (disposed || !userStore.user.isLoged) return;
  if (loading.value) {
    pendingRefresh = true;
    return;
  }
  const version = generation;
  const account = userStore.user.id;
  const session = userStore.user;
  const current = () =>
    !disposed &&
    generation === version &&
    account === userStore.user.id &&
    session === userStore.user &&
    userStore.user.isLoged;
  loading.value = true;
  loadError.value = '';
  pendingRefresh = false;
  try {
    const res = await MovieService.listMoviesPageable({
      page: 1,
      size: 10,
      sort: 'createdAt,desc',
    });
    if (!current()) return;
    movies.value = res.content;
    if (!pendingRefresh) stateSocketAllMovies.hasToExecuteUpdate = false;
  } catch {
    if (current()) {
      loadError.value = 'Não foi possível atualizar os últimos filmes.';
      showError('Erro ao carregar últimos filmes. Tente novamente.');
    }
  } finally {
    if (current()) {
      loading.value = false;
      if (pendingRefresh) {
        pendingRefresh = false;
        void loadLastMovies();
      }
    }
  }
}
</script>

<style scoped>
.mm-recent-strip {
  display: flex;
  overflow-x: auto;
  gap: 20px;
  padding: 12px 0 24px;
  scroll-snap-type: x proximity;
}
.mm-recent-strip > * {
  scroll-snap-align: start;
}
.mm-section {
  margin-bottom: 40px;
}
</style>
