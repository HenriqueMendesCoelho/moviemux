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
        <div class="col-4 q-mr-md"><InputText dense :label="'Título Do Filme'" v-model="text" :enterEvent="firstSearch" /></div>
        <div class="col-4">
          <q-btn style="width: 100%" color="kb-primary" text-color="black" label="Pesquisar" :disable="false" @click="firstSearch" />
        </div>
        <SeparatorDivSolidLine />
      </q-card-section>
      <q-separator />
      <q-card-section class="scroll" style="max-height: 60vh" v-if="movies?.length">
        <div class="q-mt-md">
          <q-infinite-scroll class="row justify-center scroll" @load="onLoad" :offset="1">
            <q-img
              class="image-search col-3 q-mx-md q-mb-md"
              :src="getImageUrl(movie.poster_path)"
              spinner-color="kb-primary"
              v-for="movie in movies"
              :key="movie.id"
              @click="showConfirmDialog(movie)"
            >
              <div class="absolute-bottom text-h6">{{ movie.title }}</div>
            </q-img>
          </q-infinite-scroll>
        </div>
        <div class="col-12 row justify-center q-my-md" v-if="loading">
          <q-spinner color="kb-primary" size="50px" />
        </div>
      </q-card-section>
    </q-card>
    <ConfirmDialog ref="confirmDialogRef" @ok="importMovie" />
  </q-dialog>
</template>
<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useQuasar } from 'quasar';
import { mapState } from 'pinia';

import { useMovieStore } from '@/stores/MovieStore';

import { ConfirmDialogRefType } from '@/components/shared/confirmDialog/types/ConfirmDialogType';
import { MovieFoundByName } from '@/types/movie/MovieType';

import KitService from '@/services/KitService';

import InputText from '@/components/shared/inputText/InputText.vue';
import SeparatorDivSolidLine from '@/components/shared/separator/SeparatorDivLineSolid.vue';
import Movie from '@/domain/movie/movie';
import ConfirmDialog from '@/components/shared/confirmDialog/ConfirmDialog.vue';

export default defineComponent({
  name: 'ImportMovie',
  components: { InputText, SeparatorDivSolidLine, ConfirmDialog },
  props: {
    moviePathId: {
      type: [String, Array],
    },
  },
  setup() {
    const $q = useQuasar();
    const confirmDialogRef = ref<ConfirmDialogRefType>();
    return {
      confirmDialogRef,
      showLoading() {
        $q.loading.show({
          spinnerColor: 'kb-primary',
        });
      },
      hideLoading() {
        $q.loading.hide();
      },
      showSuccess(msg: string) {
        $q.notify({
          type: 'positive',
          message: msg,
          position: 'top',
        });
      },
      showWarning(msg: string) {
        $q.notify({
          type: 'warning',
          message: msg,
          position: 'top',
        });
      },
      showError(msg: string) {
        $q.notify({
          type: 'negative',
          message: msg,
          position: 'top',
        });
      },
    };
  },
  data() {
    return {
      page: 1,
      pagesFouded: 2,
      loading: false,
      movies: [] as MovieFoundByName['results'],
      text: '',
      movieId: 0,
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
    getImageUrl(path?: string, size = 'w342') {
      if (!path) {
        return require('../../../assets/no-image.png');
      }
      return `${process.env.VUE_APP_TMDB_IMAGE_BASE}/${size}${path}`;
    },
    async importMovie() {
      try {
        this.showLoading();
        const res = await KitService.summary({ tmdb_id: this.movieId });
        this.moviePage.selectedMovie = new Movie(
          '',
          res.tmdb_id,
          res.imdb_id,
          res.portuguese_title,
          res.english_title,
          res.original_title,
          res.director,
          this.getImageUrl(res.url_image_portuguese || res.url_image_english, 'w500'),
          res.portuguese_url_trailer,
          res.english_url_trailer,
          res.description,
          this.getGenres(res.genres),
          new Date(res.release_date || new Date())
        );
        this.moviePage.showImportMovieDialog = false;
        this.showSuccess('Filme importado com sucesso');
      } catch {
        this.showError('Erro ao importar filme');
        return;
      } finally {
        this.hideLoading();
      }
    },
    showConfirmDialog(movie: MovieFoundByName['results'][0]) {
      this.confirmDialogRef?.dialog(`Você quer mesmo importar o filme ${movie.title}?`, 'ok', 'Confirme sua importação', 'Sim');
      this.movieId = movie.id;
    },
    getGenres(genres?: Array<string>): Array<{ id: number; name: string }> {
      if (!genres?.length) {
        return [];
      }

      const genresStore = [...this.moviePage.genres];

      return genresStore.filter((g) => genres.some((gR) => g.name === gR));
    },
  },
  watch: {
    showImportMovieDialog(val) {
      this.movies = [];
      this.text = '';

      if (val) {
        window.scrollTo(0, 0);
      }
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
