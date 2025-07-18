<template>
  <q-dialog v-model="moviePage.showImportMovieDialog">
    <q-card class="dialog-container">
      <q-card-section class="col-12 row">
        <div class="col-md-6 col-xs-10 row text-white">
          <q-icon color="white" name="download" size="lg" />
          <div class="text-title-responsive-2">Importar Filme do&nbsp;</div>
          <div
            class="text-title-responsive-2 cursor-pointer"
            @click="openURL('https://www.themoviedb.org/?language=pt-BR')"
          >
            TMDB
          </div>
        </div>
        <div class="col row justify-end">
          <q-btn
            color="white"
            icon="close"
            size="md"
            @click="moviePage.showImportMovieDialog = false"
            flat
            round
          />
        </div>
        <BaseHorizontalSeparator />
        <div class="col-12 row q-col-gutter-sm">
          <div class="col-md-4 col-xs-6">
            <BaseTextInput
              @keyup.enter="firstSearch()"
              v-model="text"
              :label="'Título Do Filme'"
              dense
            />
          </div>
          <div class="col-auto">
            <q-btn
              color="kb-primary"
              text-color="black"
              :label="isDesktop ? 'Pesquisar' : ''"
              icon="search"
              @click="firstSearch()"
            />
          </div>
          <div class="col-auto col-xs-2">
            <q-btn color="white" icon="refresh" @click="refreshSearch()" flat round />
          </div>
        </div>
        <BaseHorizontalSeparator />
      </q-card-section>
      <q-separator />
      <q-card-section
        ref="cardScrollRef"
        class="scroll"
        style="max-height: 60vh"
        v-if="movies?.length"
      >
        <q-infinite-scroll class="q-mt-md" @load="onLoad" :offset="50">
          <div
            class="row justify-center"
            :class="isDesktop ? 'q-col-gutter-xl' : 'q-col-gutter-xs'"
          >
            <div class="col-auto" v-for="movie in movies" :key="movie.id">
              <BaseCardImage
                :height="getHeight()"
                :width="getWidth()"
                :src="getImageUrl(movie.poster_path)"
                @click="showConfirmDialog(movie)"
                :animate="false"
              >
                <div class="absolute-bottom text-title-responsive-3">{{ movie.title }}</div>
              </BaseCardImage>
            </div>
          </div>
        </q-infinite-scroll>
        <div class="col-12 row justify-center q-my-md" v-if="loading">
          <q-spinner color="kb-primary" size="50px" />
        </div>
      </q-card-section>
      <q-card-section v-else>
        <div class="row justify-center">
          <div class="text-h4 text-white">Faça uma pesquisa...</div>
        </div>
      </q-card-section>
    </q-card>
    <BaseConfirmDialog ref="confirmDialogRef" @ok="importMovie" />
  </q-dialog>
</template>
<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useQuasar, openURL } from 'quasar';

import BaseTextInput from 'src/core/components/BaseTextInput.vue';
import BaseHorizontalSeparator from 'src/core/components/BaseHorizontalSeparator.vue';
import BaseConfirmDialog from 'src/core/components/BaseConfirmDialog.vue';
import BaseCardImage from 'src/core/components/BaseCardImage.vue';

import type { MovieResultResponseTmdb } from 'src/core/types/movie/MovieType';

import { useMovieStore } from '../stores/MovieStore';
import Movie from 'src/core/domain/movie/movie';

import KitService from 'src/core/services/KitService';
import { hideLoading, showLoading } from 'src/core/utils/LoadingUtils';
import { showError, showSuccess } from 'src/core/utils/NotificationUtils';

type divScrollTopRef = {
  $el: {
    scrollTo: (options: {
      top: number;
      left: number;
      behavior: 'smooth' | 'instant' | 'auto';
    }) => void;
  };
};

const $q = useQuasar();
const isDesktop = $q.platform.is.desktop;
const isMobile = $q.platform.is.mobile;

const confirmDialogRef = ref<InstanceType<typeof BaseConfirmDialog>>();
const cardScrollRef = ref<divScrollTopRef>();
const movieStore = useMovieStore();

const page = ref(1);
const pagesFouded = ref(2);
const loading = ref(false);
const movies = ref<MovieResultResponseTmdb['results']>([]);
const text = ref('');
const movieId = ref(0);

const moviePage = computed(() => movieStore.moviePage);

watch(
  () => moviePage.value.showImportMovieDialog,
  () => {
    movies.value = [];
    text.value = '';
  },
);

async function firstSearch() {
  cardScrollRef.value?.$el.scrollTo({
    top: 0,
    left: 0,
    behavior: 'smooth',
  });
  page.value = 1;
  const result = await searchMovieByName();
  movies.value = result;
}
async function searchMovieByName() {
  if (!text.value) {
    return [];
  }

  try {
    const res = await KitService.searchByName({ query: text.value, page: page.value });
    pagesFouded.value = res.total_pages;
    return res.results;
  } catch {
    return [];
  }
}
async function onLoad(index: number, done: (stop?: boolean) => void) {
  if (page.value > pagesFouded.value) {
    done(true);
    return;
  }
  loading.value = true;
  page.value += 1;
  const result = await searchMovieByName();
  movies.value.push(...result);
  done();
  loading.value = false;
}
function getImageUrl(path?: string, size = 'w342') {
  if (!path) {
    return;
  }
  return `${process.env.VUE_APP_TMDB_IMAGE_BASE}/${size}${path}`;
}
async function importMovie() {
  try {
    showLoading();
    const res = await KitService.summary({ tmdb_id: movieId.value });
    moviePage.value.selectedMovie = new Movie(
      '',
      res.tmdb_id,
      res.imdb_id,
      res.portuguese_title,
      res.english_title,
      res.original_title,
      res.director,
      getImageUrl(res.url_image_portuguese || res.url_image_english),
      res.portuguese_url_trailer,
      res.english_url_trailer,
      res.description,
      getGenres(res.genres),
      new Date(res.release_date || new Date()),
      res.runtime,
    );

    moviePage.value.showImportMovieDialog = false;
    showSuccess('Filme importado com sucesso');
  } catch {
    showError('Erro ao importar filme');
    return;
  } finally {
    hideLoading();
  }
}
function showConfirmDialog(movie: MovieResultResponseTmdb['results'][0]) {
  confirmDialogRef.value?.show({
    message: `Você quer mesmo importar o filme ${movie.title}?`,
    focus: 'ok',
    title: 'Confirme sua importação',
    ok: 'Sim',
  });
  movieId.value = movie.id;
}
function getGenres(genres?: Array<string>): Array<{ id: number; name: string }> {
  if (!genres?.length) {
    return [];
  }

  const genresStore = [...moviePage.value.genres];

  return genresStore.filter((g) => genres.some((gR) => g.name === gR));
}
async function refreshSearch() {
  text.value = '';
  await firstSearch();
}
function getHeight() {
  if (isMobile) {
    return '150px';
  }

  return '380px';
}
function getWidth() {
  if (isMobile) {
    return '100px';
  }

  return '250px';
}
</script>

<style lang="scss" scoped>
.dialog-container {
  background-color: var(--grey-dark2);

  min-width: 40vw !important;
  min-height: 60vh !important;

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
