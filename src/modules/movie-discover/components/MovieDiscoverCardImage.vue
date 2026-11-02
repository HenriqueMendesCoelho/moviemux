<template>
  <article
    ref="card"
    class="mm-discover-card"
    :aria-busy="adding"
    @contextmenu.prevent="openContextMenu"
  >
    <router-link
      :to="`/movie/discover?movie=${movie.id}`"
      class="mm-discover-poster"
      @click="emit('clickOnImage')"
      ><img
        v-if="movie.poster_path"
        :src="tmdbImageUrl(config.public.tmdbImageBase, movie.poster_path)"
        :srcset="tmdbPosterSrcset(config.public.tmdbImageBase, movie.poster_path)"
        sizes="(max-width: 700px) calc((100vw - 48px) / 2), 200px"
        :alt="movie.title"
        loading="lazy"
      />
      <div v-else class="mm-no-poster">{{ movie.title }}</div>
      <span v-if="isInAnyWishlist" class="mm-saved-badge" title="Já está em uma lista"
        >✓ Na sua lista</span
      ><span v-if="movie.vote_average" class="mm-score"
        >★ {{ movie.vote_average.toFixed(1) }}</span
      ></router-link
    >
    <div class="mm-discover-caption">
      <router-link :to="`/movie/discover?movie=${movie.id}`"
        ><h3>{{ movie.title }}</h3></router-link
      ><span>{{ movie.release_date?.slice(0, 4) || 'Em breve' }}</span>
      <details ref="menu" class="mm-card-menu" @keydown.esc.stop.prevent="closeMenu">
        <summary @click="contextPosition = undefined" :aria-label="`Opções para ${movie.title}`">
          •••
        </summary>
        <div ref="menuPanel" class="mm-card-menu-content" :style="contextPosition">
          <button type="button" class="mm-button" @click="related('similar')">
            Filmes similares</button
          ><button type="button" class="mm-button" @click="related('recommendation')">
            Recomendações</button
          ><MovieDiscoverContextMenu :movie-id="movie.id" @copy-url="emit('copy-url', $event)" />
          <details v-if="watchlists?.length">
            <summary>Adicionar à lista</summary>
            <MovieDiscoverMenuWatchlist
              :movie="movie"
              :watchlists="watchlists"
              :disabled="adding"
              @add-movie="requestAdd"
            />
          </details>
        </div>
      </details>
    </div>
    <span v-if="adding" role="status">Salvando na lista…</span>
  </article>
</template>
<script setup lang="ts">
import { computed, ref, nextTick, onMounted, onBeforeUnmount, type CSSProperties } from 'vue';
import { useRuntimeConfig } from '#imports';
import type { WatchlistType } from 'src/core/types/movie-watchlist/WatchlistType';
import type { MovieResultResponseTmdb } from 'src/core/types/movie/MovieType';
import { tmdbImageUrl, tmdbPosterSrcset } from 'src/modules/movie/utils/MovieStateUtils';
import MovieDiscoverMenuWatchlist from './MovieDiscoverMenuWatchlist.vue';
import MovieDiscoverContextMenu from './MovieDiscoverContextMenu.vue';
const props = defineProps<{
  movie: MovieResultResponseTmdb['results'][number];
  adding?: boolean;
}>();
const watchlists = defineModel<WatchlistType[]>({ default: () => [] });
const emit = defineEmits<{
  callTmdb: [value: { label: string; value: string }];
  clickOnImage: [];
  'copy-url': [id: number];
  'add-to-watchlist': [value: { id: string; movieId: number }];
}>();
const config = useRuntimeConfig(),
  card = ref<HTMLElement>(),
  menu = ref<HTMLDetailsElement>(),
  menuPanel = ref<HTMLElement>();
const contextPosition = ref<CSSProperties>();
const isInAnyWishlist = computed(() =>
  watchlists.value.some((list) =>
    list.movies_wishlists?.some((movie) => movie.tmdb_id === props.movie.id),
  ),
);
function related(type: string) {
  closeMenu();
  emit('callTmdb', {
    label: `${type === 'similar' ? 'Similares a' : 'Recomendações para'} ${props.movie.title}`,
    value: type,
  });
}
function requestAdd(id: string) {
  if (props.adding) return;
  closeMenu();
  emit('add-to-watchlist', { id, movieId: props.movie.id });
}
async function openContextMenu(event: MouseEvent) {
  if (!menu.value) return;
  menu.value.open = true;
  await nextTick();
  const size = menuPanel.value?.getBoundingClientRect();
  contextPosition.value = {
    position: 'fixed',
    right: 'auto',
    left: `${Math.max(8, Math.min(event.clientX, window.innerWidth - (size?.width || 220) - 8))}px`,
    top: `${Math.max(8, Math.min(event.clientY, window.innerHeight - (size?.height || 220) - 8))}px`,
    maxHeight: 'calc(100dvh - 16px)',
    overflowY: 'auto',
  };
  menuPanel.value?.querySelector<HTMLElement>('button')?.focus();
}
function closeMenu() {
  if (menu.value) menu.value.open = false;
  contextPosition.value = undefined;
}
function outside(event: PointerEvent) {
  if (!card.value?.contains(event.target as Node)) closeMenu();
}
onMounted(() => {
  document.addEventListener('pointerdown', outside);
  window.addEventListener('resize', closeMenu);
});
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', outside);
  window.removeEventListener('resize', closeMenu);
});
</script>
<style scoped>
.mm-discover-card {
  min-width: 0;
  position: relative;
}
.mm-discover-poster {
  position: relative;
  display: block;
  aspect-ratio: 2/3;
  border-radius: 16px;
  overflow: hidden;
  background: var(--grey-mid);
}
.mm-discover-poster img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.25s;
}
.mm-discover-poster:hover img {
  transform: scale(1.04);
}
.mm-no-poster {
  height: 100%;
  display: grid;
  place-items: center;
  padding: 1rem;
  text-align: center;
}
.mm-saved-badge,
.mm-score {
  position: absolute;
  backdrop-filter: blur(10px);
  background: #101522bb;
  border: 1px solid #ffffff20;
  border-radius: 7px;
  padding: 0.35rem 0.5rem;
  font-size: 0.65rem;
  color: #fff;
}
.mm-saved-badge {
  top: 0.6rem;
  left: 0.6rem;
}
.mm-score {
  bottom: 0.6rem;
  right: 0.6rem;
  color: #fbbf24;
}
.mm-discover-caption {
  position: relative;
  padding: 0.85rem 1.5rem 0 0;
}
.mm-discover-caption a {
  color: inherit;
  text-decoration: none;
}
.mm-discover-caption h3 {
  font-size: 0.95rem;
  line-height: 1.4;
  margin: 0 0 0.3rem;
}
.mm-discover-caption > span {
  font-size: 0.75rem;
  opacity: 0.5;
}
.mm-card-menu {
  position: absolute;
  right: 0;
  top: 0.7rem;
}
.mm-card-menu > summary {
  cursor: pointer;
  list-style: none;
  font-weight: 700;
}
.mm-card-menu-content {
  position: absolute;
  right: 0;
  top: 1.5rem;
  z-index: 10;
  width: 220px;
  background: var(--grey-dark2);
  border: 1px solid #8884;
  box-shadow: 0 12px 35px #0006;
  border-radius: 12px;
  padding: 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.mm-card-menu-content details > summary {
  padding: 0.7rem;
  cursor: pointer;
  font-size: 0.8rem;
}
</style>
