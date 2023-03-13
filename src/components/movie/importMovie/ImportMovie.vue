<template>
  <q-dialog v-model="moviePage.showImportMovieDialog">
    <q-card class="dialog-container" style="min-width: 40vw; min-height: 60vh">
      <q-card-section class="row">
        <div class="col-6">
          <h5 class="title-container">Importar Filmes</h5>
        </div>
        <div class="col-1 row offset-md-5 justify-center">
          <q-icon color="white" name="close" size="md" @click="moviePage.showImportMovieDialog = !moviePage.showImportMovieDialog" />
        </div>
        <SeparatorDivSolidLine class="q-mb-xl" />
        <div class="col-4 q-mr-md"><InputText dense :label="'Título Do Filme'" v-model="text" /></div>
        <div class="col-4">
          <q-btn style="width: 100%" color="cyan-14" text-color="black" label="Pesquisar" :disable="false" @click="firstSearch" />
        </div>
      </q-card-section>
      <q-separator />
      <q-card-section class="scroll" style="max-height: 60vh" v-if="movies?.length">
        <SeparatorDivSolidLine class="q-mb-xl" />
        <div>
          <q-infinite-scroll class="row justify-center scroll" @load="onLoad" :offset="1">
            <q-img
              class="image-search col-3 q-mx-md q-mb-md"
              :src="getImageUrl(movie.poster_path)"
              spinner-color="cyan-14"
              v-for="movie in movies"
              :key="movie.id"
            >
              <div class="absolute-bottom text-h6">{{ movie.title }}</div>
            </q-img>
          </q-infinite-scroll>
        </div>
        <div class="col-12 row justify-center q-my-md" v-if="loading">
          <q-spinner color="cyan-14" size="50px" />
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script lang="ts">
import { defineComponent } from 'vue';
import { mapState } from 'pinia';

import { useMovieStore } from '@/stores/MovieStore';

import KitService from '@/services/KitService';

import InputText from '@/components/shared/inputText/InputText.vue';
import SeparatorDivSolidLine from '@/components/shared/separator/SeparatorDivLineSolid.vue';
import { MovieFoundByName } from '@/types/movie/MovieType';
import Movie from '@/domain/movie/movie';

export default defineComponent({
  name: 'ImportMovie',
  components: { InputText, SeparatorDivSolidLine },
  data() {
    return {
      page: 1,
      pagesFouded: 2,
      loading: false,
      movies: [] as MovieFoundByName['results'],
      text: '',
      showConfirmDialog: false,
    };
  },
  computed: {
    ...mapState(useMovieStore, ['moviePage']),
    showImportMovieDialog() {
      return this.moviePage.showImportMovieDialog;
    },
  },
  methods: {
    async firstSearch() {
      this.page = 1;
      const result = await this.searchMovieByName();
      this.movies = result;
    },
    async searchMovieByName() {
      if (!this.text) {
        return [];
      }

      try {
        const res = await KitService.searchByName({ query: this.text, page: this.page });
        this.pagesFouded = res.total_pages;
        return res.results;
      } catch {
        return [];
      }
    },
    async onLoad(index: number, done: (stop?: boolean) => void) {
      if (this.page >= this.pagesFouded) {
        done(true);
        return;
      }
      this.loading = true;
      this.page += 1;
      const result = await this.searchMovieByName();
      this.movies.push(...result);
      done();
      this.loading = false;
    },
    getImageUrl(path?: string) {
      if (!path) {
        return require('../../../assets/no-image.png');
      }

      const urlBase = 'https://image.tmdb.org/t/p/w342';

      return `${urlBase}/${path}`;
    },
    async importMovie(id: number) {
      try {
        const res = await KitService.summary({ tmdb_id: id });
        this.moviePage.selectedMovie = new Movie(
          '',
          res.tmdb_id,
          res.portuguese_title,
          res.english_title,
          res.original_title,
          res.director,
          res.url_image_portuguese,
          res.portuguese_url_trailer,
          res.english_url_trailer,
          res.description,
          [],
          new Date(res.release_date || new Date()).toLocaleDateString()
        );
        this.moviePage.showImportMovieDialog = false;
      } catch {
        return;
      }
    },
  },
  watch: {
    showImportMovieDialog() {
      this.movies = [];
      this.text = '';
    },
  },
});
</script>

<style lang="scss">
.dialog-container {
  background: var(--grey-dark2);

  overflow-y: hidden;

  border: var(--grey-mid) solid 5px;
  border-radius: 15px !important;

  .title-container {
    color: white;
  }

  .image-search {
    border-radius: 15px;
  }
}
</style>
