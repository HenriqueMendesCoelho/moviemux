<template>
  <article class="mm-discover-card" :aria-busy="adding">
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
      ></router-link
    >
    <div class="mm-discover-caption">
      <router-link :to="`/movie/discover?movie=${movie.id}`"
        ><h3 :title="movie.title">{{ movie.title }}</h3></router-link
      ><span>{{ movie.release_date?.slice(0, 4) || 'Em breve' }}</span>
      <BaseContextMenu
        class="mm-card-menu"
        :label="`Opções para ${movie.title}`"
        :title="movie.title"
      >
        <button type="button" @click="related('similar')">Filmes similares</button>
        <button type="button" @click="related('recommendation')">Recomendações</button>
        <MovieDiscoverContextMenu :movie-id="movie.id" @copy-url="emit('copy-url', $event)" />
        <template v-if="watchlists?.length">
          <p class="mm-menu-group-label">Adicionar à lista</p>
          <MovieDiscoverMenuWatchlist
            :movie="movie"
            :watchlists="watchlists"
            :disabled="adding"
            @add-movie="requestAdd"
          />
        </template>
      </BaseContextMenu>
    </div>
    <span v-if="adding" role="status">Salvando na lista…</span>
  </article>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import BaseContextMenu from 'src/core/components/BaseContextMenu.vue';
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
const config = useRuntimeConfig();
const isInAnyWishlist = computed(() =>
  watchlists.value.some((list) =>
    list.movies_wishlists?.some((movie) => movie.tmdb_id === props.movie.id),
  ),
);
function related(type: string) {
  emit('callTmdb', {
    label: `${type === 'similar' ? 'Similares a' : 'Recomendações para'} ${props.movie.title}`,
    value: type,
  });
}
function requestAdd(id: string) {
  if (props.adding) return;
  emit('add-to-watchlist', { id, movieId: props.movie.id });
}
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
  transition: transform 0.2s ease;
}
@media (hover: hover) and (pointer: fine) {
  .mm-discover-poster:hover {
    transform: translateY(-4px);
  }
}
.mm-discover-poster:focus-visible {
  transform: translateY(-4px);
}
@media (prefers-reduced-motion: reduce) {
  .mm-discover-poster {
    transition: none;
    transform: none !important;
  }
}
.mm-discover-poster img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.mm-no-poster {
  height: 100%;
  display: grid;
  place-items: center;
  padding: 1rem;
  text-align: center;
}
.mm-saved-badge {
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
.mm-discover-caption {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 44px;
  align-items: start;
  gap: 5px 4px;
  padding-top: 0.75rem;
}
.mm-discover-caption a {
  min-width: 0;
  color: inherit;
  text-decoration: none;
}
.mm-discover-caption h3 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
  min-height: 2.8em;
  font-size: 0.95rem;
  line-height: 1.4;
  margin: 0;
}
.mm-discover-caption > span {
  grid-column: 1 / -1;
  font-size: 0.75rem;
  line-height: 1.5;
  opacity: 0.5;
}
.mm-discover-caption > .mm-card-menu {
  grid-column: 2;
  grid-row: 1;
}
.mm-menu-group-label {
  margin: 0.5rem 0.7rem 0.25rem;
  color: var(--mm-muted);
  font-size: 0.7rem;
  font-weight: 600;
}
</style>
