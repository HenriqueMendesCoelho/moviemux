<template>
  <ContainerMain>
    <h4 style="color: white" v-if="!allMovies.length">Não há nenhum filme ainda...</h4>
    <div class="div-lastfilms" v-if="allMovies.length">
      <div class="div-title">
        <button>
          <span
            :class="`material-icons ${!isVisibleLastFilms && 'last-films-toggle'}`"
            style="font-size: 25pt"
            @click="isVisibleLastFilms = !isVisibleLastFilms"
          >
            expand_less
          </span>
        </button>
        <h4>Últimos Filmes</h4>
        <div style="flex: 1 1 0"></div>
        <button @click="showMessage('teste')">
          <span class="material-icons rf_icon" style="font-size: 18pt"> refresh </span>
        </button>
      </div>
      <div class="container-lastmovies" v-auto-animate>
        <div class="div-cards-lastfilm" v-if="isVisibleLastFilms">
          <div v-for="(movie, index) in allMovies.slice(0, 8)" :key="index">
            <ContextMenuHome :movieId="movie.id" />
            <CardImageMovie :id="movie.id" :title="movie.titulo" :url="movie.url" :height="cardSize" :footer="true" />
          </div>
        </div>
      </div>
    </div>
    <div class="div-allfilms" v-if="allMovies.length">
      <div class="search-input">
        <input type="text" name="search" placeholder="Digite..." v-model="imageCheck" />
        <button class="search-btn" @click="checkImage(imageCheck)">BUSCAR</button>
        <button class="end-btn">
          <span class="material-icons" style="font-size: 18pt"> refresh </span>
        </button>
      </div>
      <q-infinite-scroll class="container-cards-films" @load="onLoad" :offset="10">
        <div class="cards-films" v-for="movie in allMovies" :key="movie.id">
          <ContextMenuHome :deleteEnable="true" :movieId="movie.id" />
          <CardImageMovie :id="movie.id" :title="movie.titulo" :url="movie.url" :note="movie.note" :height="350" :spaced="false" />
        </div>
      </q-infinite-scroll>
      <div class="row justify-center q-my-md" v-if="loading">
        <q-spinner color="cyan-14" size="50px" />
      </div>
    </div>
  </ContainerMain>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapState } from 'pinia';
import { useQuasar } from 'quasar';

import ContainerMain from '../shared/containerMain/ContainerMain.vue';
import ContextMenuHome from './contextMenuHome/ContextMenuHome.vue';
import CardImageMovie from './cardImageMovie/CardImageMovie.vue';

import { useStyleStore } from '@/stores/StyleStore';
import { useMovieStore } from '@/stores/MovieStore';

import imageUtils from '@/utils/imageUtils';

export default defineComponent({
  name: 'HomeApp',
  components: {
    ContainerMain,
    ContextMenuHome,
    CardImageMovie,
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
    ...mapState(useMovieStore, ['allMovies']),
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
  methods: {
    async checkImage(url: string) {
      // https://i.imgur.com/fj6Bn7O.png >> Imagem com Altura de 75px e largura de 1200 px

      try {
        const img = await imageUtils.checkImageSizeByUrl(url);

        if (!img.imgOk) {
          this.showError('A imagem deve ter no mínimo 350px de altura e no max 1200px e de largura no mínimo 550px e no max 1100px.');
          return;
        }
        this.showMessage('Imagem OK!');
      } catch {
        this.showError('Insira uma url válida para a imagem');
      }
    },
    pushToMovie(id: number): void {
      this.$router.push({ name: 'movie', params: { id: id } });
    },
    onLoad(index: number, done: (stop?: boolean) => void): void {
      if (this.pageLoading >= 3) {
        done(true);
        return;
      }
      this.loading = true;
      setTimeout(() => {
        this.allMovies.push(...this.allMovies);
        this.pageLoading += 1;
        done();
        this.loading = false;
      }, 2000);
    },
  },
});
</script>

<style lang="scss" scoped>
.div-lastfilms {
  display: flex;
  flex-direction: column;
  padding: 1rem;
  overflow: hidden;
  transition: 0.2s ease-out;

  max-width: 100%;

  //height: 5vh;
  height: 40%;
  max-height: 480px;

  color: var(--light-grey2);
  border-radius: 10px;
  background-color: var(--grey-mid);
  box-shadow: 0 5px 30px var(--shadow);

  @media (max-width: 768px) {
    display: none;
  }

  .last-films-toggle {
    transform: rotate(-180deg);
  }

  .rf_icon {
    &:hover {
      transform: scale(1.2);
    }
  }

  .div-title {
    display: flex;
    justify-content: flex-start;
    align-items: center;

    max-width: 100%;

    //transition: 0.2s ease-out;

    border-radius: 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);

    .material-icons {
      font-size: 2rem;
      color: var(--light-grey2);
      margin-right: 15px;
      margin-top: 0px;
      transition: 0.2s ease-out;

      cursor: pointer;

      &:hover {
        color: var(--primary);
      }
    }
  }

  .container-lastmovies {
    height: 100%;
    overflow: hidden;

    .div-cards-lastfilm {
      display: flex;
      justify-content: center;
      height: 100%;

      a {
        text-decoration: none;
        color: inherit;
      }

      @media (max-width: 768px) {
        flex-direction: column;
        overflow-y: scroll;
      }
    }
  }
}
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
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
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
