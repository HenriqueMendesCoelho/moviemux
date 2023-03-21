<template>
  <div class="div-allfilms">
    <div class="search-input">
      <input type="text" name="search" placeholder="Digite..." v-model="searchText" />
      <button class="search-btn" @click="search()">BUSCAR</button>
      <button class="end-btn" @click="refreshSearch()">
        <span class="material-icons" style="font-size: 18pt"> refresh </span>
      </button>
    </div>
    <q-infinite-scroll class="container-cards-films" @load="onLoad" :offset="10">
      <div class="cards-films" v-for="movie in movies" :key="movie.id">
        <CardImageAllMovies :movie="movie" />
      </div>
    </q-infinite-scroll>
    <div class="row justify-center q-my-md" v-if="loading">
      <q-spinner color="kb-primary" size="50px" />
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue';

import Movie from '@/domain/movie/movie';

import CardImageAllMovies from './cardImageAllMovies/CardImageAllMovies.vue';
import MovieService from '@/services/MovieService';

export default defineComponent({
  name: 'AllMovies',
  components: { CardImageAllMovies },
  data() {
    return {
      movies: [] as Movie[],
      loading: false,
      pagesFouded: 2,
      page: 1,
      searchText: '',
    };
  },
  mounted() {
    this.loading = false;
    this.pagesFouded = 2;
    this.page = 1;
  },
  methods: {
    async search() {
      this.pagesFouded = 2;
      this.page = 1;
      const res = await this.searchMoviePageable();
      this.movies = res;
      this.loading = false;
    },
    async onLoad(index: number, done: (stop?: boolean) => void) {
      if (this.page >= this.pagesFouded) {
        done(true);
        return;
      }
      const result = await this.searchMoviePageable();
      this.page += 1;
      this.movies.push(...result);
      done();
      this.loading = false;
    },
    async searchMoviePageable() {
      if (this.searchText) {
        const res = await MovieService.listMoviesByTitlePageable(this.page, this.searchText);
        this.pagesFouded = res.total_pages;
        if (this.page >= this.pagesFouded) {
          this.loading = true;
        }

        return res.content;
      } else {
        const res = await MovieService.listMoviesPageable(this.page, 'portugueseTitle,asc', 20);
        if (this.page >= this.pagesFouded) {
          this.loading = true;
        }
        return res.content;
      }
    },
    async refreshSearch() {
      this.searchText = '';
      await this.search();
    },
  },
});
</script>
<style lang="scss">
.div-allfilms {
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
    height: 5vh;
    width: 100%;
    margin-bottom: 20px;

    font-size: 15pt;

    display: flex;
    overflow: hidden;
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

    justify-content: center;
    align-items: center;
    text-align: center;

    max-width: 100%;

    .cards-films {
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
