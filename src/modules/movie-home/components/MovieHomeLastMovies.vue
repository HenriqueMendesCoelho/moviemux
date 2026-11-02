<template>
  <section class="mm-section" v-if="movies.length || loading || loadError">
    <header class="mm-recent-heading">
      <h2>Recentes</h2>
      <div class="mm-recent-actions">
        <button
          class="mm-recent-control"
          :aria-expanded="isVisibleLastFilms"
          :aria-label="isVisibleLastFilms ? 'Recolher recentes' : 'Expandir recentes'"
          :title="isVisibleLastFilms ? 'Recolher recentes' : 'Expandir recentes'"
          @click="toggleVisible"
        >
          <BaseIcon :name="isVisibleLastFilms ? 'chevron-up' : 'chevron-down'" />
        </button>
        <button
          class="mm-recent-control"
          aria-label="Atualizar recentes"
          title="Atualizar recentes"
          :disabled="loading"
          @click="loadLastMovies"
        >
          <BaseIcon name="refresh" />
        </button>
      </div>
    </header>
    <p v-if="loadError" role="alert">{{ loadError }}</p>
    <div
      ref="recentRegion"
      :inert="!isVisibleLastFilms"
      :aria-hidden="!isVisibleLastFilms"
      :style="!isVisibleLastFilms ? { height: '0px', overflow: 'hidden' } : undefined"
      class="mm-recent-strip"
      :class="{ 'mm-recent-expanded': showAllRecent }"
    >
      <MovieHomeCardImageLastMovies
        v-for="movie in movies"
        :key="movie.id"
        :id="movie.id"
        :title="movie.portuguese_title"
        :url="movie.url_image"
      />
    </div>
    <button
      v-if="isVisibleLastFilms && movies.length > 4"
      class="mm-recent-more"
      :aria-expanded="showAllRecent"
      @click="toggleExpanded"
    >
      {{ showAllRecent ? 'Ver menos' : 'Ver mais' }}
    </button>
  </section>
</template>

<script lang="ts" setup>
import { animateHeightChange } from 'src/core/ui/animateHeightChange';
import BaseIcon from 'src/core/components/BaseIcon.vue';
import { onActivated, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { useUserStore } from 'src/core/stores/UserStore';

import type Movie from 'src/core/domain/movie/movie';

import MovieHomeCardImageLastMovies from './MovieHomeCardImageLastMovies.vue';

import MovieService from 'src/modules/movie/services/MovieService';
import { socketAllMovies, stateSocketAllMovies } from 'src/boot/socket';

import { showError } from 'src/core/utils/NotificationUtils';

const userStore = useUserStore();
const recentRegion = ref<HTMLElement>();
function toggleExpanded() {
  void animateHeightChange(recentRegion.value, () => {
    showAllRecent.value = !showAllRecent.value;
  });
}
function toggleVisible() {
  void animateHeightChange(recentRegion.value, () => {
    isVisibleLastFilms.value = !isVisibleLastFilms.value;
  });
}
const isVisibleLastFilms = ref(true);
const showAllRecent = ref(false);
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
.mm-recent-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}
.mm-recent-heading h2 {
  margin: 0;
}
.mm-recent-actions {
  display: flex;
  flex-flow: row nowrap;
  gap: 4px;
}
.mm-recent-control {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border: 1px solid var(--grey-mid2);
  border-radius: 12px;
  background: transparent;
  color: var(--mm-text);
  cursor: pointer;
}
.mm-recent-control:hover {
  background: var(--grey-mid);
}
.mm-recent-control:disabled {
  opacity: 0.45;
  cursor: wait;
}
.mm-recent-strip {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 24px 16px;
}
.mm-recent-strip:not(.mm-recent-expanded) > :nth-child(n + 6) {
  display: none;
}
.mm-recent-more {
  display: block;
  margin: 12px auto 0;
  min-height: 44px;
  padding: 8px 16px;
  color: var(--mm-muted);
  background: transparent;
  border: 0;
  text-decoration: underline;
  text-underline-offset: 4px;
  cursor: pointer;
}
.mm-section {
  margin-bottom: 32px;
}
@media (min-width: 601px) and (max-width: 1200px) {
  .mm-recent-strip {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  .mm-recent-strip:not(.mm-recent-expanded) > :nth-child(n + 5) {
    display: none;
  }
}
@media (max-width: 600px) {
  .mm-recent-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px 12px;
  }
  .mm-recent-strip:not(.mm-recent-expanded) > :nth-child(n + 5) {
    display: none;
  }
  .mm-recent-more {
    display: block;
    margin: 12px auto 0;
    min-height: 44px;
    padding: 8px 16px;
    color: var(--mm-muted);
    background: transparent;
    border: 0;
    text-decoration: underline;
    text-underline-offset: 4px;
    cursor: pointer;
  }
}
</style>
