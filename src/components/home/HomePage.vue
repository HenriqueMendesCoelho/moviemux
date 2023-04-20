<template>
  <ContainerMain>
    <LastMovies />
    <AllMovies />
  </ContainerMain>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import ContainerMain from '../shared/containerMain/ContainerMain.vue';
import LastMovies from './lastMovies/LastMovies.vue';
import AllMovies from './allMovies/AllMovies.vue';

export default defineComponent({
  name: 'HomePage',
  components: {
    ContainerMain,
    LastMovies,
    AllMovies,
  },
  beforeRouteEnter() {
    document.title = 'Cineminha - Home';
  },
});
</script>
