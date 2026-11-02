<template>
  <section class="mm-tmdb-credits" :aria-labelledby="headingId">
    <h2 :id="headingId">Créditos</h2>
    <a
      href="https://www.themoviedb.org"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="The Movie Database (abre em nova aba)"
    >
      <img :src="tmdbLogo" alt="The Movie Database" width="90" height="7" />
    </a>
    <p lang="en">This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
  </section>
</template>
<script setup lang="ts">
import { useId } from 'vue';
import tmdbLogo from 'src/assets/tmdb-logo-long.svg';
const headingId = useId();
</script>
<style scoped>
.mm-tmdb-credits {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  color: var(--mm-muted);
}
h2 {
  font-size: 0.8rem;
  font-weight: 600;
  margin: 0;
}
a {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
}
img {
  width: 90px;
  height: auto;
}
p {
  font-size: 0.75rem;
  line-height: 1.6;
  margin: 0;
}
</style>
