<template>
  <article class="mm-poster-card" :aria-busy="loading" :data-reordering="reordering || undefined">
    <button
      class="mm-poster-link"
      type="button"
      :disabled="disabled || reordering"
      :aria-label="t('library.detailsFor', { name: movie.title || movie.title_english })"
      @click="!disabled && !reordering && emit('open')"
    >
      <BaseCardImage
        :src="getUrl()"
        :alt="movie.title || movie.title_english"
        :animate="animate && !disabled && !reordering"
        ><span v-if="isInAnyWishlist()" class="mm-badge">{{
          showRemoveItem ? t('library.otherLists') : t('library.inYourList')
        }}</span></BaseCardImage
      >
    </button>
    <div class="mm-film-caption">
      <button
        class="mm-film-title"
        type="button"
        :disabled="disabled || reordering"
        @click="!disabled && !reordering && emit('open')"
      >
        <h3 :title="movie.title || movie.title_english">
          {{ movie.title || movie.title_english }}
        </h3>
      </button>
      <BaseContextMenu
        v-if="!reordering"
        class="mm-film-menu"
        :label="t('library.optionsFor', { name: movie.title || movie.title_english })"
        :title="movie.title || movie.title_english"
      >
        <button type="button" :disabled="loading || disabled" @click="emit('copy-url')">
          <BaseIcon name="share" />{{ t('library.copyLink') }}
        </button>
        <template v-if="_wishlists.length">
          <p class="mm-menu-section" role="presentation">{{ t('library.addAnotherList') }}</p>
          <button
            v-for="list in _wishlists"
            :key="list.id"
            type="button"
            :disabled="loading || disabled || store.pendingMembership[list.id] || disableList(list)"
            @click="addMovieToWishlist(list.id, movie.tmdb_id)"
          >
            <BaseIcon :name="disableList(list) ? 'check' : 'plus'" />
            {{ list.name
            }}<span v-if="disableList(list)" class="mm-sr-only">
              {{ t('library.alreadyHere') }}</span
            >
          </button>
        </template>
        <button
          v-if="showRemoveItem"
          class="mm-remove-movie"
          type="button"
          :disabled="loading || disabled"
          @click="emit('removeMovie')"
        >
          <BaseIcon name="close" />{{ t('library.removeFromList') }}
        </button>
      </BaseContextMenu>
      <p class="mm-film-date" :title="DateUtils.toLocaleDateStringLong(movie.release_date, locale)">
        {{ DateUtils.toLocaleDateStringLong(movie.release_date, locale) }}
      </p>
    </div>
    <p v-if="loading" role="status" class="mm-film-saving">{{ t('library.saving') }}</p>
  </article>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t, locale } = useI18n();
import { computed, onBeforeUnmount, ref } from 'vue';
import { useRuntimeConfig } from '#imports';
import { useMovieWatchlistStore } from '../stores/MovieWatchlistStore';
import { useUserStore } from 'src/core/stores/UserStore';

import type { WatchlistType } from 'src/core/types/movie-watchlist/WatchlistType';

import { tmdbImageUrl } from 'src/modules/movie/utils/MovieStateUtils';
import BaseCardImage from 'src/core/components/BaseCardImage.vue';
import BaseContextMenu from 'src/core/components/BaseContextMenu.vue';
import BaseIcon from 'src/core/components/BaseIcon.vue';

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
  reordering?: boolean;
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
  return tmdbImageUrl(imageBase, path, 'w500');
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
    showSuccess('library.movieAdded');
  } catch {
    if (!disposed && account === user.user.id && session === user.user)
      showError('library.addMovieFailed');
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
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
  color: inherit;
  border-radius: 16px;
  transform: none;
}
.mm-poster-link:disabled {
  cursor: default;
  opacity: 1;
}
.mm-poster-link:focus-visible {
  outline: 2px solid var(--mm-focus-ring);
  outline-offset: 2px;
}
.mm-film-caption {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 44px;
  align-items: start;
  column-gap: 4px;
  row-gap: 5px;
  margin-top: 8px;
}
.mm-film-title {
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
  color: var(--mm-text);
  text-align: left;
  transform: none;
}
.mm-film-title:disabled {
  opacity: 1;
  cursor: default;
}
.mm-film-title h3 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 2.8em;
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.4;
  overflow-wrap: anywhere;
}
.mm-film-menu {
  grid-column: 2;
  grid-row: 1;
}
.mm-film-date {
  grid-column: 1 / -1;
  margin: 0;
  color: var(--mm-muted);
  font-size: 0.78rem;
  line-height: 1.5;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}
[data-reordering] .mm-film-caption {
  grid-template-columns: minmax(0, 1fr);
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
.mm-menu-section {
  margin: 4px 6px;
  padding: 8px 5px 3px;
  border-top: 1px solid var(--mm-border);
  font-size: 0.72rem;
  color: var(--mm-muted);
}
.mm-remove-movie {
  color: var(--mm-danger-text) !important;
  border-top: 1px solid var(--mm-border) !important;
  margin-top: 4px !important;
  border-radius: 0 0 8px 8px !important;
}
.mm-film-saving {
  margin: 4px 0 0;
  min-height: 1.5em;
  color: var(--mm-muted);
  font-size: 0.75rem;
}
</style>
