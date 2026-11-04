<template>
  <div class="mm-watchlist-menu">
    <p v-if="!watchlists?.length">{{ t('catalog.createList') }}</p>
    <button
      v-for="list in watchlists"
      :key="list.id"
      type="button"
      class="mm-button"
      :disabled="disableList(list)"
      :title="
        list.movies_wishlists?.length >= 100
          ? t('catalog.listFull')
          : disableList(list)
            ? t('catalog.alreadyAdded')
            : ''
      "
      @click="emit('addMovie', list.id)"
    >
      {{ list.name }} <span v-if="disableList(list)">✓</span>
    </button>
  </div>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
import { useUserStore } from 'src/core/stores/UserStore';
import type { WatchlistType } from 'src/core/types/movie-watchlist/WatchlistType';
import type { MovieResultResponseTmdb } from 'src/core/types/movie/MovieType';
const props = defineProps<{
  movie: MovieResultResponseTmdb['results'][number] | number;
  watchlists: WatchlistType[];
  disabled?: boolean;
}>();
const user = useUserStore();
const emit = defineEmits<{ addMovie: [id: string] }>();
function disableList(list: WatchlistType) {
  const id = typeof props.movie === 'number' ? props.movie : props.movie.id;
  return (
    props.disabled ||
    !user.user.isLoged ||
    list.user.id !== user.user.id ||
    list.movies_wishlists?.some((movie) => movie.tmdb_id === id) ||
    list.movies_wishlists?.length >= 100
  );
}
</script>
<style scoped>
.mm-watchlist-menu {
  display: flex;
  gap: 0.5rem;
  flex-direction: column;
}
.mm-watchlist-menu button {
  text-align: left;
}
</style>
