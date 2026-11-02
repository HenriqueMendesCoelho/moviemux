<template>
  <article class="mm-recent-card mm-poster-card">
    <router-link :to="{ name: 'movie', params: { id } }"
      ><BaseCardImage :src="url" :animate="false" />
      <h3>{{ title }}</h3></router-link
    ><MovieHomeContextMenu :movie-id="id || ''" />
  </article>
</template>

<script lang="ts" setup>
import MovieHomeContextMenu from './MovieHomeContextMenu.vue';
import BaseCardImage from 'src/core/components/BaseCardImage.vue';

interface Props {
  id: string | undefined;
  url: string | undefined;
  title: string | undefined;
}

defineProps<Props>();
</script>

<style scoped>
.mm-recent-card {
  width: 150px;
  flex-shrink: 0;
}
.mm-recent-card a {
  text-decoration: none;
  color: inherit;
}
.mm-recent-card h3 {
  font-size: 0.9rem;
  margin-top: 10px;
  line-height: 1.4;
}
@media (max-width: 600px) {
  .mm-recent-card {
    width: 120px;
  }
}
</style>
