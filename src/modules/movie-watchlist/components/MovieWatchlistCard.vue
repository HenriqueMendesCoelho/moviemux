<template>
  <article class="mm-list-card">
    <router-link
      class="mm-list-preview"
      :to="destination"
      :aria-label="`Abrir lista ${wishlist.name}`"
      @click="emit('clickOnCard')"
    >
      <img
        v-for="movie in previewMovies"
        :key="movie.tmdb_id"
        :src="poster(movie.url_image)"
        :srcset="tmdbPosterSrcset(imageBase, movie.url_image)"
        sizes="(max-width: 600px) 30vw, 120px"
        alt=""
        loading="lazy"
        draggable="false"
      />
      <span v-if="!previewMovies.length" class="mm-list-placeholder"
        ><BaseIcon name="plus" />Sua próxima seleção começa aqui</span
      >
    </router-link>
    <div class="mm-list-body">
      <div class="mm-list-title-row">
        <div>
          <h2>
            <router-link :to="destination">{{ wishlist.name }}</router-link>
          </h2>
          <p>
            {{ wishlist.movies_wishlists?.length || 0 }} filmes <span aria-hidden="true">·</span>
            {{ wishlist.shareable ? 'Pública' : 'Privada' }}
          </p>
        </div>
        <MovieWatchlistCardContextMenu
          :disabled="disabled"
          @delete="emit('delete')"
          @copy-url="emit('copy-url')"
        />
      </div>
      <div class="mm-list-footer">
        <span :title="`Criada em ${DateUtils.toLocaleString(wishlist.created_at)}`"
          >Atualizada {{ updatedDate }}</span
        ><router-link :to="destination" class="mm-list-enter"
          >Abrir lista <BaseIcon name="chevron-right"
        /></router-link>
      </div>
    </div>
  </article>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { useRuntimeConfig } from '#imports';
import type { WatchlistType } from 'src/core/types/movie-watchlist/WatchlistType';
import DateUtils from 'src/core/utils/DateUtils';
import BaseIcon from 'src/core/components/BaseIcon.vue';
import { tmdbImageUrl, tmdbPosterSrcset } from 'src/modules/movie/utils/MovieStateUtils';
import MovieWatchlistCardContextMenu from './MovieWatchlistCardContextMenu.vue';
const props = defineProps<{ wishlist: WatchlistType; disabled?: boolean }>();
const emit = defineEmits<{ clickOnCard: []; delete: []; 'copy-url': [] }>();
const imageBase = String(useRuntimeConfig().public.tmdbImageBase);
const destination = computed(() => ({
  name: 'movie-watchlist-id',
  params: { id: props.wishlist.id },
}));
const previewMovies = computed(() =>
  (props.wishlist.movies_wishlists || []).filter((movie) => !!movie.url_image).slice(0, 4),
);
const updatedDate = computed(() => {
  const date = new Date(props.wishlist.updated_at);
  return Number.isNaN(date.getTime())
    ? 'recentemente'
    : date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
});
function poster(path: string) {
  return tmdbImageUrl(imageBase, path, 'w342');
}
</script>
<style scoped>
.mm-list-card {
  min-width: 0;
  border: 1px solid var(--mm-border);
  border-radius: 16px;
  background: var(--mm-surface);
  overflow: clip;
  transition: border-color 0.18s;
}
.mm-list-card:hover {
  border-color: var(--mm-accent);
}
.mm-list-preview {
  display: flex;
  height: 128px;
  gap: 3px;
  background: var(--mm-raised);
  overflow: hidden;
  color: var(--mm-muted);
  text-decoration: none;
}
.mm-list-preview img {
  width: 25%;
  flex: 1;
  min-width: 0;
  height: 100%;
  object-fit: cover;
  object-position: center 28%;
}
.mm-list-placeholder {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 20px;
  font-size: 0.85rem;
}
.mm-list-body {
  padding: 17px 18px 14px;
}
.mm-list-title-row {
  display: flex;
  gap: 12px;
  justify-content: space-between;
  align-items: flex-start;
}
.mm-list-title-row > div {
  min-width: 0;
}
h2 {
  margin: 0 0 7px;
  font-size: 1.05rem;
  line-height: 1.3;
  overflow-wrap: anywhere;
}
h2 a {
  color: var(--mm-text);
  text-decoration: none;
}
p {
  margin: 0;
  color: var(--mm-muted);
  font-size: 0.8rem;
}
p span {
  margin: 0 5px;
}
.mm-list-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  border-top: 1px solid var(--mm-border);
  margin-top: 14px;
  padding-top: 12px;
  font-size: 0.75rem;
  color: var(--mm-muted);
}
.mm-list-enter {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  color: var(--mm-accent-text, var(--mm-text));
  text-decoration: none;
  font-weight: 600;
  min-height: 32px;
}
.mm-list-enter svg {
  width: 15px;
}
@media (prefers-reduced-motion: reduce) {
  .mm-list-card {
    transition: none;
  }
}
</style>
