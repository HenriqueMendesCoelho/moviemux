<template>
  <div class="div-lastfilms" v-if="movies?.length">
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
      <button @click="loadLastMovies()">
        <span class="material-icons rf_icon" style="font-size: 18pt"> refresh </span>
      </button>
    </div>
    <div class="container-lastmovies" v-auto-animate>
      <div class="div-cards-lastfilm" v-if="isVisibleLastFilms">
        <div v-for="movie of movies.slice(0, 10)" :key="movie.id">
          <CardImageMovie class="q-mt-md q-px-sm" :id="movie.id" :title="movie.portuguese_title" :url="movie.url_image" :footer="true" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import Movie from '@/domain/movie/movie';
import MovieService from '@/services/MovieService';

import CardImageMovie from './cardImageLastMovies/CardImageLastMovies.vue';

export default defineComponent({
  name: 'LastMovies',
  components: { CardImageMovie },
  data() {
    return {
      loading: true,
      isVisibleLastFilms: true,
      movies: [] as Movie[],
    };
  },
  async mounted() {
    await this.loadLastMovies();
  },
  methods: {
    pushToMovie(id: number): void {
      this.$router.push({ name: 'movie', params: { id: id } });
    },
    disableLoading() {
      setTimeout(() => {
        this.loading = !this.loading;
      }, 100);
    },
    async loadLastMovies() {
      const res = await MovieService.listMoviesPageable(1, 10, 'createdAt,desc');
      this.movies = res.content;
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

    transition: 0.2s ease-out;

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
</style>
