<template>
  <BaseContainerMain>
    <LastMovies />
    <AllMovies />
  </BaseContainerMain>
</template>

<script lang="ts" setup>
import BaseContainerMain from 'src/core/components/BaseContainerMain.vue';
import LastMovies from './lastMovies/LastMovies.vue';
import AllMovies from './allMovies/AllMovies.vue';
</script>
