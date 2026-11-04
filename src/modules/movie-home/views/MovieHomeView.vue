<template>
  <BaseContainerMain>
    <header class="mm-collection-heading">
      <h1>{{ t('catalog.collection') }}</h1>
      <router-link class="mm-button mm-button-primary mm-home-add" :to="{ name: 'add' }"
        ><BaseIcon name="plus" /> <span class="mm-add-long-label">{{ t('catalog.addMovie') }}</span
        ><span class="mm-add-short-label">{{ t('catalog.add') }}</span></router-link
      >
    </header>
    <MovieHomeLastMovies />
    <MovieHomeGridMovies />
  </BaseContainerMain>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
import BaseIcon from 'src/core/components/BaseIcon.vue';
import BaseContainerMain from 'src/core/components/BaseContainerMain.vue';
import MovieHomeLastMovies from '../components/MovieHomeLastMovies.vue';
import MovieHomeGridMovies from '../components/MovieHomeGridMovies.vue';
</script>

<style scoped>
.mm-collection-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 0 24px;
}
.mm-collection-heading h1 {
  margin: 0;
  font-size: clamp(1.4rem, 3vw, 2rem);
  letter-spacing: -0.03em;
}
.mm-home-add {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.mm-add-short-label {
  display: none;
}
@media (max-width: 600px) {
  .mm-home-add {
    font-size: 0.8rem;
    padding-inline: 10px;
  }
}
@media (max-width: 380px) {
  .mm-add-short-label {
    display: inline;
  }
  .mm-add-long-label {
    display: none;
  }
  .mm-collection-heading h1 {
    font-size: 1.25rem;
  }
}
</style>
