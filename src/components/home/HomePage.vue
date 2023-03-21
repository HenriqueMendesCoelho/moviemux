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
          position: 'bottom',
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

<style lang="scss" scoped>
.div-allfilms {
  //border: 5px solid pink;

  margin-top: 20px;
  max-width: 100%;

  flex-direction: column;
  display: flex;
  align-items: center;
  justify-content: center;

  @media (max-width: 768px) {
    min-width: 100%;
  }

  .search-input {
    max-width: 100%;
    //border: 5px solid blue;
    height: 5vh;
    width: 100%;
    margin-bottom: 20px;

    font-size: 15pt;

    display: flex;
    overflow: hidden;
    //border: 5px solid green;
    input {
      max-width: 100%;
      padding: 15px;
      color: var(--light-grey2);
      width: 85%;
      height: 100%;
      border-top-left-radius: 15px;
      border-end-start-radius: 15px;

      box-shadow: 0 5px 30px var(--shadow);

      box-sizing: border-box;
      border: none;
      outline: none;

      background-color: var(--grey-mid);

      @media (max-width: 768px) {
        min-width: 60%;
        max-width: 60%;
      }

      input::placeholder {
        max-width: 100%;
        color: var(--light-grey2);

        margin-left: 55px;
      }
    }

    .end-btn {
      border-end-end-radius: 15px;
      border-start-end-radius: 15px;

      width: 5%;

      @media (max-width: 768px) {
        min-width: 15%;
        max-width: 15%;
      }
    }

    .search-btn {
      width: 15%;
    }

    button {
      background-color: var(--dark-alt);
      width: 15%;

      color: var(--light-grey);
      font-weight: 500;

      @media (max-width: 768px) {
        min-width: 25%;
        max-width: 25%;
      }

      &:hover {
        background-color: var(--dark-alt2);
        border: solid 3px var(--dark-alt);

        color: var(--primary);
      }
    }
  }

  .container-cards-films {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    //border: 5px solid green;

    justify-content: center;
    align-items: center;
    text-align: center;

    max-width: 100%;

    .cards-films {
      //border: 5px solid yellow;

      .img-movies {
        max-width: 100%;
        object-fit: cover;
        max-height: 350px;

        border-radius: 15px;

        transition: 0.2s ease-out;

        box-shadow: 0 5px 30px var(--shadow);

        &:hover {
          transform: scale(1.1);

          transition: 0.2s ease-out;
        }
      }
    }
  }
}
</style>
