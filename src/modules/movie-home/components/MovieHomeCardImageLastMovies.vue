<template>
  <article class="mm-recent-card mm-poster-card">
    <router-link :to="{ name: 'movie', params: { id } }"
      ><BaseCardImage :src="url" :alt="title" :animate="false" />
    </router-link>
    <div class="mm-card-footer">
      <router-link :to="{ name: 'movie', params: { id } }"
        ><h3 :title="title">{{ title }}</h3></router-link
      ><MovieHomeContextMenu :movie-id="id || ''" />
    </div>
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
  width: 100%;
  min-width: 0;
}
.mm-recent-card a {
  text-decoration: none;
  color: inherit;
}
.mm-recent-card h3 {
  font-size: 0.9rem;
  margin: 0;
  line-height: 1.4;
}
@media (max-width: 600px) {
  .mm-recent-card {
    width: 100%;
  }
}
.mm-card-footer {
  display: flex;
  align-items: start;
  gap: 4px;
  margin-top: 8px;
}
.mm-card-footer > a {
  flex: 1;
  min-width: 0;
}
.mm-card-footer :deep(details) {
  flex-shrink: 0;
  margin: 0;
}
.mm-card-footer h3 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.mm-card-footer :deep(summary) {
  border-color: transparent;
  background: transparent;
  box-shadow: none;
  padding-inline: 0;
  width: 44px;
}
</style>
