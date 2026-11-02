<template>
  <details class="mm-list-info">
    <summary>Sobre esta lista</summary>
    <dl>
      <dt>Criada por</dt>
      <dd>{{ watchlist.user.name }}</dd>
      <dt>Filmes</dt>
      <dd>{{ watchlist.movies_wishlists?.length || 0 }}/100</dd>
      <dt>Criação</dt>
      <dd>{{ DateUtils.toLocaleString(watchlist.created_at) }}</dd>
      <dt>Atualização</dt>
      <dd>{{ DateUtils.toLocaleString(watchlist.updated_at) }}</dd>
    </dl>
  </details>
</template>

<script setup lang="ts">
import type { WatchlistType } from 'src/core/types/movie-watchlist/WatchlistType';

import DateUtils from 'src/core/utils/DateUtils';

interface Props {
  watchlist: WatchlistType;
}
defineProps<Props>();
</script>

<style scoped>
.mm-list-info {
  font-size: 0.85rem;
  max-width: 360px;
}
.mm-list-info summary {
  cursor: pointer;
  color: var(--primary);
}
dl {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 16px;
  padding: 16px;
  background: var(--grey-dark2);
  border-radius: 12px;
}
dt {
  opacity: 0.6;
}
dd {
  margin: 0;
}
</style>
