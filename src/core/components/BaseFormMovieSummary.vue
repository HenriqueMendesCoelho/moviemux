<template>
  <div class="row justify-center text-white" :class="!isMobile && 'q-mx-md'">
    <div class="col-md-4 col-xs-12 q-px-lg text-center justify-center row">
      <q-img
        class="col-12"
        style="border-radius: 20px; max-height: 100% !important"
        :src="movie.url_image"
        :draggable="false"
        :width="getImgWidth()"
        :height="getImgHeight()"
        v-if="movie?.url_image"
      />
      <q-skeleton v-else :width="getImgWidth()" :height="getImgHeight()" animation="fade" dark bordered />
    </div>

    <div class="col-md-8 col-xs-12">
      <div class="row" :class="!isScreenLtLg ? 'q-col-gutter-y-lg' : 'q-col-gutter-y-md'">
        <div class="col-12 text-title-responsive-2">Informações</div>
        <div class="col-12 row q-col-gutter-sm">
          <BaseTextInput
            ref="inputTextPortugueseTitleRef"
            class="col-md col-xs-12"
            :label="'Título PT-BR'"
            v-model="movie.portuguese_title"
            readonly
            required
            :dense="screenHeight <= 1080"
          />
          <BaseTextInput
            v-if="showEnglishTitle()"
            ref="inputTextEnglishTitleRef"
            class="col-md col-xs-12"
            :label="'Título Inglês'"
            v-model="movie.english_title"
            readonly
            :dense="screenHeight <= 1080"
          />
          <BaseTextInput
            ref="inputTextOriginalTitleRef"
            class="col-md col-xs-12"
            :label="'Título Original'"
            v-model="movie.original_title"
            readonly
            :dense="screenHeight <= 1080"
          />
        </div>
        <div class="col-12 row q-col-gutter-sm">
          <BaseTextInput
            ref="inputTextDirectorRef"
            class="col-md-8 col-xs-12"
            :label="'Diretor'"
            v-model="movie.director"
            readonly
            required
            :dense="screenHeight <= 1080"
          />
          <BaseTextInput
            class="col-md-2 col-xs-6"
            :label="'Tempo de duração'"
            :modelValue="runtimeToText()"
            readonly
            :dense="screenHeight <= 1080"
          />
          <BaseTextInput
            ref="inputTextReleaseDateRef"
            class="col-md-2 col-xs-6"
            :label="'Ano de lançamento'"
            :modelValue="movie.release_date ? new Date(movie.release_date).toLocaleDateString() : ''"
            readonly
            :mask="'##/##/####'"
            required
            :dense="screenHeight <= 1080"
          />
        </div>
        <div class="col-12 row q-col-gutter-x-sm">
          <q-input
            ref="qInputDescriptionRef"
            class="col-md-7 col-xs-12"
            standout="text-info"
            color="info"
            outlined
            v-model="movie.description"
            input-style="resize: none;"
            :rows="screenHeight > 1080 ? '9' : '7'"
            label="Descrição - Sinopse"
            bg-color="grey-mid2"
            dark
            type="textarea"
            readonly
            :dense="screenHeight <= 1080"
          />
          <div class="col-md-5 col-xs-12 row" :class="isMobile && 'q-col-gutter-y-sm q-mt-md'">
            <q-select
              ref="qSelectGenresRef"
              class="col-12"
              outlined
              v-model="movie.genres"
              label="Generos"
              standout="text-info"
              color="info"
              bg-color="grey-mid2"
              dark
              :multiple="true"
              popup-content-class="bg-grey-dark2"
              option-label="name"
              readonly
              :dense="screenHeight <= 1080"
              use-chips
              ><template v-slot:selected-item="scope">
                <q-chip dense :tabindex="scope.tabindex" color="grey-dark2" text-color="white" class="q-ma-none">
                  {{ scope.opt.name }}
                </q-chip>
              </template>
            </q-select>
            <BaseTextInput
              ref="inputTextTmdbIdRef"
              class="col-12"
              :label="'Tmdb ID'"
              :modelValue="`${movie.tmdb_id}`"
              @update:modelValue="movie.tmdb_id = parseInt($event)"
              type="number"
              readonly
              :dense="screenHeight <= 1080"
              :icon="'open_in_new'"
              iconTooltip="Abrir TMDB"
              icon-cursor="pointer"
              @iconClick="openTmdbInNewTab"
            />
            <BaseTextInput
              class="col-12"
              :label="'Imdb ID'"
              v-model="movie.imdb_id"
              readonly
              :dense="screenHeight <= 1080"
              :icon="'open_in_new'"
              iconTooltip="Abrir IMDB"
              icon-cursor="pointer"
              @iconClick="openImdbInNewTab"
            />
          </div>
        </div>

        <div class="col-12 row q-col-gutter-sm">
          <div class="col-12 text-title-responsive-2" v-if="movie?.portuguese_url_trailer || movie?.english_url_trailer">Trailers</div>
          <q-video
            class="col-md col-xs-12"
            :src="getUrl(movie.portuguese_url_trailer)"
            style="height: 300px"
            v-if="movie?.portuguese_url_trailer"
          />
          <q-video
            class="col-md col-xs-12"
            :src="getUrl(movie.english_url_trailer)"
            style="height: 300px"
            v-if="movie?.english_url_trailer"
          />
        </div>

        <div class="col-12 row q-col-gutter-md">
          <div class="col-auto" v-if="movieId">
            <BaseDialogCast :movie-id="movieId" />
          </div>
          <div class="col row justify-end" v-if="movieId">
            <BaseMovieWatchProviders class="col-auto" :tmdb-id="movieId" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useQuasar } from 'quasar';

import Movie from 'src/core/domain/movie/movie';

import BaseTextInput from 'src/core/components/BaseTextInput.vue';
import BaseMovieWatchProviders from 'src/core/components/BaseMovieWatchProviders.vue';
import BaseDialogCast from 'src/core/components/BaseBtnDialogCast.vue';

import KitService from 'src/core/services/KitService';
import MovieService from 'src/modules/movie/services/MovieService';
import StringUtils from 'src/core/utils/StringUtils';
import { hideLoading, showLoading } from 'src/core/utils/LoadingUtils';
import { showError } from 'src/core/utils/NotificationUtils';

const $q = useQuasar();
const isMobile = $q.platform.is.mobile;
const screenHeight = $q.screen.height;
const isScreenLtLg = computed(() => $q.screen.lt.lg);

const movie = ref(new Movie());

const props = defineProps<{ movieId: number }>();
const emit = defineEmits<{
  (e: 'error', value: void): void;
}>();

onMounted(async () => {
  if (props.movieId) {
    await getMovie();
  }
});

function runtimeToText() {
  return StringUtils.runtimeToText(movie.value.runtime);
}
function showEnglishTitle() {
  return movie.value.original_title !== movie.value.english_title;
}
function openTmdbInNewTab() {
  if (!movie.value.tmdb_id) {
    return;
  }
  openNewWindow(`https://www.themoviedb.org/movie/${movie.value.tmdb_id}`);
}
function openImdbInNewTab() {
  if (!movie.value.imdb_id) {
    return;
  }
  openNewWindow(`https://www.imdb.com/title/${movie.value.imdb_id}`);
}
function openNewWindow(url: string) {
  const w = window.open(url);
  if (w) {
    w.focus();
  }
}
async function getGenres(genres?: Array<string>): Promise<Array<{ id: number; name: string; tmdb_id: number }>> {
  if (!genres?.length) {
    return [];
  }
  const allGenres = await MovieService.getMoviesGenres();

  return allGenres.filter((g) => genres.some((gR) => g.name === gR));
}
async function getMovie() {
  if (!props.movieId) {
    return;
  }
  showLoading();
  try {
    const res = await KitService.summary({ tmdb_id: props.movieId });
    movie.value = new Movie(
      '',
      res.tmdb_id,
      res.imdb_id,
      res.portuguese_title,
      res.english_title,
      res.original_title,
      res.director,
      getImageUrl(res.url_image_portuguese || res.url_image_english, 'w500'),
      res.portuguese_url_trailer,
      res.english_url_trailer,
      res.description,
      await getGenres(res.genres),
      new Date(res.release_date || new Date()),
      res.runtime
    );
  } catch {
    showError('Erro ao carregar filme');
    emit('error');
  } finally {
    hideLoading();
  }
}

function getImageUrl(path?: string, size = 'w342') {
  if (!path) {
    return;
  }
  return `${process.env.VUE_APP_TMDB_IMAGE_BASE}/${size}${path}`;
}
function getUrl(key: string) {
  return key ? `https://www.youtube.com/embed/${key}` : '';
}
function getImgWidth() {
  if (isMobile) {
    return '200px';
  }
  if (screenHeight <= 1050) {
    return '350px';
  }

  return '500px';
}
function getImgHeight() {
  if (isMobile) {
    return '350px';
  }

  if (screenHeight <= 1050) {
    return '450px';
  }

  return '750px';
}
</script>
src/core/utils/StringUtils
