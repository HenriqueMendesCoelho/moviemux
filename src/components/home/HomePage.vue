<template>
  <ContainerMain>
    <LastMovies />
    <AllMovies />
  </ContainerMain>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapState } from 'pinia';
import { useQuasar } from 'quasar';

import ContainerMain from '../shared/containerMain/ContainerMain.vue';
import LastMovies from './lastMovies/LastMovies.vue';
import AllMovies from './allMovies/AllMovies.vue';

import { useStyleStore } from '@/stores/StyleStore';

export default defineComponent({
  name: 'HomeApp',
  components: {
    ContainerMain,
    LastMovies,
    AllMovies,
  },
  setup() {
    document.title = 'Cineminha - Home';

    const $q = useQuasar();

    return {
      showError(msg: string) {
        $q.notify({
          type: 'negative',
          message: msg,
          position: 'top',
        });
      },
      showMessage(msg: string) {
        $q.notify({
          type: 'positive',
          message: msg,
          position: 'center',
        });
      },
    };
  },
  data() {
    return {
      lastFilms_expanded: 'transform: rotate(0deg);',
      lastFilms_height: 'height: 40%;',
      imageCheck: '',
      isVisibleLastFilms: true,
      pageLoading: 1,
      loading: false,
    };
  },
  mounted() {
    this.pageLoading = 0;
  },
  computed: {
    ...mapState(useStyleStore, ['getMarginSideBar']),
    cardSize(): number {
      const screenWidth = window.screen.height;
      if (screenWidth <= 1440 && screenWidth > 1080) {
        return 300;
      }
      if (screenWidth <= 1080 && screenWidth > 900) {
        return 250;
      }
      return 150;
    },
  },
});
</script>
