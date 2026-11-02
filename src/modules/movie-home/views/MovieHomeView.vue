<template>
  <BaseContainerMain>
    <header class="mm-collection-heading">
      <p class="mm-eyebrow">BIBLIOTECA PESSOAL</p>
      <h1>Sua coleção, <span>em cena.</span></h1>
      <p class="mm-muted">Histórias que ficaram com você. Descobertas que ainda estão por vir.</p>
    </header>
    <MovieHomeLastMovies />
    <MovieHomeGridMovies />
  </BaseContainerMain>
</template>

<script lang="ts" setup>
import BaseContainerMain from 'src/core/components/BaseContainerMain.vue';
import MovieHomeLastMovies from '../components/MovieHomeLastMovies.vue';
import MovieHomeGridMovies from '../components/MovieHomeGridMovies.vue';
</script>

<style scoped>
.mm-collection-heading {
  padding: 12px 0 14px;
}
.mm-collection-heading h1 {
  margin: 10px 0 14px;
  font-size: clamp(2.2rem, 4vw, 3.6rem);
}
.mm-collection-heading h1 span {
  color: var(--mm-accent-text);
}
.mm-collection-heading > p:last-child {
  font-size: 14px;
  max-width: 560px;
}
</style>
