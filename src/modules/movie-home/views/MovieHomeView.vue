<template>
  <BaseContainerMain>
    <MovieHomeLastMovies />
    <MovieHomeGridMovies />
  </BaseContainerMain>
</template>

<script lang="ts" setup>
import BaseContainerMain from 'src/core/components/BaseContainerMain.vue';
import MovieHomeLastMovies from '../components/MovieHomeLastMovies.vue';
import MovieHomeGridMovies from '../components/MovieHomeGridMovies.vue';
</script>
