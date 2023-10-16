<template>
  <ContainerMain>
    <LastMovies />
    <AllMovies />
  </ContainerMain>
</template>

<script lang="ts" setup>
import ContainerMain from '../shared/containerMain/ContainerMain.vue';
import LastMovies from './lastMovies/LastMovies.vue';
import AllMovies from './allMovies/AllMovies.vue';
</script>
