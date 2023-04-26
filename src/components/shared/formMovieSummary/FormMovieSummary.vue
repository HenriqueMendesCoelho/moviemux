<template>
  <div class="row justify-center q-mx-md text-white" style="overflow: auto">
    <q-img
      style="border-radius: 20px"
      class="col-3 q-mx-xl q-py-xs"
      :src="movie.url_image"
      :draggable="false"
      :height="screenHeight > 1080 ? '750px' : '600px'"
      :width="screenHeight > 1080 ? '500px' : '400px'"
      v-if="movie?.url_image"
    />
    <q-skeleton class="col-3" v-else width="600px" height="750px" animation="fade" dark bordered />
    <div class="col q-ml-xl">
      <div class="row q-col-gutter-y-md">
        <div class="col-12" :class="screenHeight > 1080 ? 'text-h3' : 'text-h4'">Informações</div>
        <div class="col-12 row q-col-gutter-sm">
          <InputText
            ref="inputTextPortugueseTitleRef"
            class="col"
            :label="'Título PT-BR'"
            v-model="movie.portuguese_title"
            readonly
            required
            :dense="screenHeight <= 1080"
          />
          <InputText
            v-if="showEnglishTitle()"
            ref="inputTextOriginalTitleRef"
            class="col"
            :label="'Título Original'"
            v-model="movie.original_title"
            readonly
            :dense="screenHeight <= 1080"
          />
          <InputText
            ref="inputTextEnglishTitleRef"
            class="col"
            :label="'Título Inglês'"
            v-model="movie.english_title"
            readonly
            required
            :dense="screenHeight <= 1080"
          />
        </div>
        <div class="col-12 row q-col-gutter-sm">
          <InputText
            ref="inputTextDirectorRef"
            class="col-8"
            :label="'Diretor'"
            v-model="movie.director"
            readonly
            required
            :dense="screenHeight <= 1080"
          />
          <InputText class="col-2" :label="'Tempo de duração'" :modelValue="runtimeToText()" readonly :dense="screenHeight <= 1080" />
          <InputText
            ref="inputTextReleaseDateRef"
            class="col-2"
            :label="'Ano de lançamento'"
            :modelValue="movie.release_date ? new Date(movie.release_date).toLocaleDateString() : ''"
            readonly
            :mask="'##/##/####'"
            required
            :dense="screenHeight <= 1080"
          />
        </div>
        <div class="col-12 row q-col-gutter-sm">
          <q-input
            ref="qInputDescriptionRef"
            class="col-7"
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
          <div class="col-5 row">
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
            />
            <InputText
              ref="inputTextTmdbIdRef"
              class="col-12"
              :label="'Tmdb ID'"
              :modelValue="`${movie.tmdb_id}`"
              @update:modelValue="movie.tmdb_id = parseInt($event)"
              type="number"
              readonly
              :dense="screenHeight <= 1080"
              :icon="'open_in_new'"
              :iconTooltip="'Abrir tmdb'"
              :iconFunction="openTmdbInNewTab"
            />
            <InputText
              class="col-12"
              :label="'Imdb ID'"
              v-model="movie.imdb_id"
              readonly
              :dense="screenHeight <= 1080"
              :icon="'open_in_new'"
              :iconTooltip="'Abrir imdb'"
              :iconFunction="openImdbInNewTab"
            />
          </div>
        </div>

        <div class="col-12 row q-col-gutter-x-sm justify-center">
          <div class="col-12 text-h5">Trailers</div>
          <q-video class="col" :src="getUrl(movie.portuguese_url_trailer)" style="height: 300px" v-if="movie?.portuguese_url_trailer" />
          <q-video class="col" :src="getUrl(movie.english_url_trailer)" style="height: 300px" v-if="movie?.english_url_trailer" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import Movie from '@/domain/movie/movie';
import { useQuasar } from 'quasar';
import KitService from '@/services/KitService';
import MovieService from '@/services/MovieService';
import InputText from '../inputText/InputText.vue';

const $q = useQuasar();
const movie = ref(new Movie());

const screenHeight = computed(() => {
  return $q.screen.height;
});

const props = defineProps<{ movieId: number }>();

const emit = defineEmits<{
  (e: 'error', value: void): void;
}>();

onMounted(async () => {
  if (props.movieId) {
    await getMovie();
  }
});

function showError(msg: string) {
  $q.notify({
    type: 'negative',
    message: msg,
    position: 'top',
  });
}

function showLoading() {
  $q.loading.show({
    spinnerColor: 'kb-primary',
  });
}

function hideLoading() {
  $q.loading.hide();
}

function runtimeToText() {
  const runtime = movie.value.runtime;
  if (!runtime) {
    return '0';
  }
  const hours = Math.floor(runtime / 60);
  const minutes = runtime - 60 * hours;

  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
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
async function getGenres(genres?: Array<string>): Promise<Array<{ id: number; name: string }>> {
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
</script>
