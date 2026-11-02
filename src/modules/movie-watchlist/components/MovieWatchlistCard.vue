<template>
  <article class="mm-list-card" @click="emit('clickOnCard')">
    <header>
      <h3>
        <router-link :to="{ name: 'movie-watchlist-id', params: { id: wishlist.id } }">{{
          wishlist.name
        }}</router-link>
      </h3>
      <span class="mm-badge">{{ wishlist.shareable ? 'Pública' : 'Privada' }}</span>
    </header>
    <strong>{{ wishlist.movies_wishlists?.length || 0 }}<small> / 100 filmes</small></strong>
    <p>Criada em {{ DateUtils.toLocaleString(wishlist.created_at) }}</p>
    <p>Atualizada em {{ DateUtils.toLocaleString(wishlist.updated_at) }}</p>
    <div class="mm-actions">
      <button type="button" class="mm-button" @click.prevent.stop="emit('copy-url')">
        Copiar link</button
      ><button
        type="button"
        class="mm-button mm-button-danger"
        :disabled="disabled"
        @click.prevent.stop="emit('delete')"
      >
        Excluir
      </button>
    </div>
    <MovieWatchlistCardContextMenu
      v-if="!disabled"
      @delete="emit('delete')"
      @copy-url="emit('copy-url')"
    />
  </article>
</template>

<script setup lang="ts">
import type { WatchlistType } from 'src/core/types/movie-watchlist/WatchlistType';

import DateUtils from 'src/core/utils/DateUtils';

import MovieWatchlistCardContextMenu from './MovieWatchlistCardContextMenu.vue';

interface Props {
  wishlist: WatchlistType;
  disabled?: boolean;
}

const emit = defineEmits<{
  (e: 'clickOnCard', value: void): void;
  (e: 'delete', value: void): void;
  (e: 'copy-url', value: void): void;
}>();

defineProps<Props>();
</script>

<style scoped>
.mm-list-card {
  height: 100%;
  padding: 24px;
  border: 1px solid var(--grey-mid2);
  border-radius: 18px;
  background: var(--grey-dark2);
  transition:
    transform 0.2s,
    border-color 0.2s;
}
.mm-list-card:hover {
  transform: translateY(-3px);
  border-color: var(--primary);
}
header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 24px;
}
h3 {
  font-size: 1.1rem;
}
strong {
  display: block;
  font-size: 2rem;
  margin-bottom: 18px;
}
small {
  font-size: 0.9rem;
  opacity: 0.55;
}
p {
  font-size: 0.8rem;
  opacity: 0.6;
  line-height: 1.8;
}
.mm-actions {
  margin-top: 20px;
}
</style>
