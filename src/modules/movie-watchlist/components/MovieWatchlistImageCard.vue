<template>
  <article class="mm-poster-card">
    <button class="mm-poster-link" type="button" @click="emit('open')">
      <BaseCardImage :src="getUrl()" :animate="animate"
        ><span v-if="isInAnyWishlist()" class="mm-badge">{{
          showRemoveItem ? 'Em outras listas' : 'Já na sua lista'
        }}</span></BaseCardImage
      >
      <h3>{{ movie.title || movie.title_english }}</h3>
      <p>{{ DateUtils.toLocaleDateStringLong(movie.release_date) }}</p>
    </button>
    <details class="mm-card-actions" @click.stop>
      <summary>Ações do filme</summary>
      <div class="mm-menu">
        <button
          v-if="showRemoveItem"
          type="button"
          :disabled="loading || disabled"
          @click="emit('removeMovie')"
        >
          Remover desta lista</button
        ><button type="button" @click="emit('copy-url')">Copiar link</button>
        <p v-if="_wishlists.length">Adicionar a outra lista</p>
        <button
          v-for="list in _wishlists"
          :key="list.id"
          :disabled="loading || disabled || store.pendingMembership[list.id] || disableList(list)"
          @click="addMovieToWishlist(list.id, movie.tmdb_id)"
        >
          {{ list.name }}{{ disableList(list) ? ' ✓' : '' }}
        </button>
      </div>
    </details>
    <p v-if="loading" role="status">Salvando…</p>
  </article>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { useRuntimeConfig } from '#imports';
import { useMovieWatchlistStore } from '../stores/MovieWatchlistStore';
import { useUserStore } from 'src/core/stores/UserStore';

import type { WatchlistType } from 'src/core/types/movie-watchlist/WatchlistType';

import BaseCardImage from 'src/core/components/BaseCardImage.vue';

import DateUtils from 'src/core/utils/DateUtils';

import { showError, showSuccess } from 'src/core/utils/NotificationUtils';

type ArrayElement<ArrayType extends readonly unknown[]> =
  ArrayType extends readonly (infer ElementType)[] ? ElementType : never;
const props = defineProps<{
  movie: ArrayElement<WatchlistType['movies_wishlists']>;
  wishlists: WatchlistType[];
  showRemoveItem: boolean;
  animate: boolean;
  disabled?: boolean;
}>();

interface Emits {
  (e: 'open', value: void): void;
  (e: 'removeMovie', value: void): void;
  (e: 'copy-url', value: void): void;
}
const emit = defineEmits<Emits>();

const loading = ref(false);
const store = useMovieWatchlistStore();
const imageBase = String(useRuntimeConfig().public.tmdbImageBase).replace(/\/$/, '');
const user = useUserStore();
const _wishlists = computed(() =>
  props.wishlists
    .filter((list) => list.user.id === user.user.id)
    .map((list) => store.watchlists.find((item) => item.id === list.id) || list),
);
let disposed = false;
onBeforeUnmount(() => {
  disposed = true;
});
function getUrl() {
  const path = props.movie?.url_image;
  return path ? `${imageBase}/w500${path.startsWith('/') ? '' : '/'}${path}` : '';
}
function disableList(list: WatchlistType) {
  return list.movies_wishlists?.some((movie) => movie.tmdb_id === props.movie.tmdb_id);
}
async function addMovieToWishlist(wishlistId: string, tmdbId: number) {
  if (loading.value || props.disabled || !user.user.isLoged) return;
  const target = _wishlists.value.find((list) => list.id === wishlistId);
  if (!target || target.user.id !== user.user.id || disableList(target)) return;
  const account = user.user.id;
  const session = user.user;
  loading.value = true;
  try {
    const added = await store.addMovie(wishlistId, tmdbId);
    if (
      !added ||
      disposed ||
      account !== user.user.id ||
      session !== user.user ||
      !user.user.isLoged
    )
      return;
    showSuccess('Filme adicionado à lista com sucesso');
  } catch {
    if (!disposed && account === user.user.id && session === user.user)
      showError('Erro ao adicionar filme na lista');
  } finally {
    if (!disposed) loading.value = false;
  }
}
function isInAnyWishlist() {
  return _wishlists.value.some((list) =>
    list.movies_wishlists?.some((movie) => movie.tmdb_id === props.movie.tmdb_id),
  );
}
</script>

<style scoped>
.mm-poster-card {
  min-width: 0;
  position: relative;
}
.mm-poster-link {
  display: block;
  text-align: left;
  width: 100%;
  color: inherit;
  padding: 0;
}
.mm-poster-link h3 {
  font-size: 1rem;
  margin: 12px 0 5px;
  line-height: 1.4;
}
.mm-poster-link p {
  font-size: 0.8rem;
  opacity: 0.6;
}
.mm-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  background: #111c;
  color: #fff;
  padding: 5px 8px;
  border-radius: 6px;
  font-size: 0.7rem;
}
.mm-card-actions {
  font-size: 0.8rem;
  margin-top: 12px;
}
.mm-card-actions summary {
  cursor: pointer;
}
.mm-menu {
  display: grid;
  padding: 10px;
  background: var(--grey-dark2);
  border: 1px solid var(--grey-mid2);
  border-radius: 10px;
  gap: 4px;
}
.mm-menu button {
  color: inherit;
  padding: 8px;
  text-align: left;
}
.mm-menu button:disabled {
  opacity: 0.4;
}
</style>
