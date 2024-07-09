<template>
  <div class="row justify-center scroll overflow-hidden-x form-movie" :class="!isMobile && 'q-mx-md'">
    <div class="col-md-4 col-xs-12 q-px-lg text-center justify-center row">
      <q-img
        class="col-12"
        style="border-radius: 20px"
        :src="getImageAndAlt()[0]"
        :alt="getImageAndAlt()[1]"
        :draggable="false"
        :width="getImgWidth()"
        :height="getImgHeight()"
        v-if="moviePage.selectedMovie?.url_image"
      >
        <ContextMenuFormMovieImage />
        <TooltipMovieInfo />
      </q-img>
      <q-skeleton v-else :width="getImgWidth()" :height="getImgHeight()" animation="fade" dark bordered />
    </div>
    <div class="col-md-8 col-xs-12">
      <div class="row" :class="screenHeight > 1080 ? 'q-col-gutter-y-lg' : 'q-col-gutter-y-sm'">
        <div class="col-12 text-title-responsive-2">Informações</div>
        <div class="col-12 row q-col-gutter-sm">
          <InputText
            ref="inputTextPortugueseTitleRef"
            class="col-md col-xs-12"
            :label="'Título PT-BR'"
            v-model="moviePage.selectedMovie.portuguese_title"
            :readonly="!isRegisterOrEditing"
            required
            :dense="screenHeight <= 1080"
          />
          <InputText
            v-if="showEnglishTitle()"
            ref="inputTextEnglishTitleRef"
            class="col-md col-xs-12"
            :label="'Título Inglês'"
            v-model="moviePage.selectedMovie.english_title"
            :readonly="!isRegisterOrEditing"
            required
            :dense="screenHeight <= 1080"
          />
          <InputText
            ref="inputTextOriginalTitleRef"
            class="col-md col-xs-12"
            :label="'Título Original'"
            v-model="moviePage.selectedMovie.original_title"
            :readonly="!isRegisterOrEditing"
            :dense="screenHeight <= 1080"
          />
        </div>
        <div class="col-12 row q-col-gutter-sm">
          <InputText
            ref="inputTextDirectorRef"
            class="col-md-8 col-xs-12"
            :label="'Diretor'"
            v-model="moviePage.selectedMovie.director"
            :readonly="!isRegisterOrEditing"
            required
            :dense="screenHeight <= 1080"
          />
          <InputText
            v-if="isRegisterOrEditing"
            ref="inputTextRuntimeRef"
            class="col-md-2 col-xs-6"
            :label="'Tempo de duração em minutos'"
            :modelValue="moviePage.selectedMovie.runtime?.toString()"
            @change="moviePage.selectedMovie.runtime = Number($event)"
            :mask="'###'"
            required
            :dense="screenHeight <= 1080"
          />
          <InputText
            v-else
            class="col-md-2 col-xs-6"
            :label="'Tempo de duração'"
            :modelValue="runtimeToText()"
            :readonly="true"
            :dense="screenHeight <= 1080"
          />
          <InputText
            ref="inputTextReleaseDateRef"
            class="col-md-2 col-xs-6"
            :label="'Ano de lançamento'"
            :modelValue="DateUtils.toLocaleDateString(moviePage.selectedMovie.release_date)"
            @change="changeReleaseDate"
            :readonly="!isRegisterOrEditing"
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
            v-model="moviePage.selectedMovie.description"
            input-style="resize: none;"
            :rows="screenHeight > 1080 ? '9' : '7'"
            label="Descrição - Sinopse"
            bg-color="grey-mid2"
            dark
            type="textarea"
            :readonly="!isRegisterOrEditing"
            :rules="[(val) => !!val || '*Obrigatório']"
            :lazy-rules="true"
            :dense="screenHeight <= 1080"
          />
          <div class="col-md-5 col-xs-12 row" :class="isMobile && 'q-col-gutter-x-sm'">
            <q-select
              ref="qSelectGenresRef"
              class="col-12"
              outlined
              :options="moviePage.genres"
              v-model="moviePage.selectedMovie.genres"
              label="Gêneros"
              standout="text-info"
              color="info"
              bg-color="grey-mid2"
              dark
              :multiple="true"
              popup-content-class="bg-grey-dark2"
              option-label="name"
              clearable
              :rules="[(val) => !!val?.length]"
              hideBottomSpace
              :readonly="!isRegisterOrEditing"
              :lazy-rules="true"
              :dense="screenHeight <= 1080"
              use-chips
            >
              <template v-slot:selected-item="scope">
                <q-chip
                  :removable="isRegisterOrEditing"
                  dense
                  @remove="scope.removeAtIndex(scope.index)"
                  :tabindex="scope.tabindex"
                  color="grey-dark2"
                  text-color="white"
                  class="q-ma-none"
                >
                  {{ scope.opt.name }}
                </q-chip>
              </template>
            </q-select>
            <InputText
              ref="inputTextTmdbIdRef"
              class="col-12"
              :label="'Tmdb ID'"
              :modelValue="`${moviePage.selectedMovie.tmdb_id}`"
              @update:modelValue="moviePage.selectedMovie.tmdb_id = parseInt($event)"
              type="number"
              :readonly="true"
              :dense="screenHeight <= 1080"
              :icon="!isRegisterOrEditing ? 'open_in_new' : ''"
              :icon-tooltip="'Abrir TMDB'"
              icon-cursor="pointer"
              @iconClick="openTmdbInNewTab"
            />
            <InputText
              class="col-12"
              :label="'Imdb ID'"
              v-model="moviePage.selectedMovie.imdb_id"
              :readonly="!isRegisterOrEditing"
              :dense="screenHeight <= 1080"
              :icon="!isRegisterOrEditing ? 'open_in_new' : ''"
              icon-tooltip="Abrir IMDB"
              icon-cursor="pointer"
              @iconClick="openImdbInNewTab"
            />
          </div>
        </div>

        <div class="col-12 row q-col-gutter-x-sm">
          <div class="col-12 text-title-responsive-2">Urls</div>
          <InputText
            ref="inputTextUrlImageRef"
            class="col-5"
            :label="'URL da Imagem'"
            v-model="moviePage.selectedMovie.url_image"
            :readonly="!isRegisterOrEditing"
            required
            :dense="screenHeight <= 1080"
          />
          <InputText
            ref="inputTextUrlTrailerBrRef"
            class="col"
            :label="'URL do trailer dublado'"
            :model-value="moviePage.selectedMovie.portuguese_url_trailer"
            @change="changeTrailerPortuguese"
            :readonly="!isRegisterOrEditing"
            :customRules="
              () =>
                !!(moviePage.selectedMovie.portuguese_url_trailer || moviePage.selectedMovie.english_url_trailer) ||
                'É necessário ter url do trailer dublado ou legendado'
            "
            :hint="isRegisterOrEditing ? 'Insira a url do youtube ou key do video' : ''"
            :dense="screenHeight <= 1080"
          />
          <InputText
            ref="inputTextUrlTrailerEnRef"
            class="col"
            :label="'URL do trailer legendado'"
            :model-value="moviePage.selectedMovie.english_url_trailer"
            @change="changeTrailerEnglish"
            :readonly="!isRegisterOrEditing"
            :customRules="
              () =>
                !!(moviePage.selectedMovie.portuguese_url_trailer || moviePage.selectedMovie.english_url_trailer) ||
                'É necessário ter url do trailer dublado ou legendado'
            "
            :hint="props.isRegisterOrEditing ? 'Insira a url do youtube ou key do video' : ''"
            :dense="screenHeight <= 1080"
          />
        </div>
        <div class="col-12 row q-col-gutter-md">
          <div class="col-auto" v-if="moviePage.selectedMovie.notes?.length && moviePage.selectedMovie.show_notes">
            <div class="text-h6">Nota</div>
            <ChipNote :size="isMobile ? 'lg' : 'xl'" :movie="moviePage.selectedMovie" :dense="screenHeight <= 1080" />
          </div>
          <div class="col-auto">
            <BtnDialogCast :movie-id="moviePage.selectedMovie.tmdb_id" />
          </div>
          <div class="col offset-1 row justify-end" v-if="moviePage.selectedMovie.tmdb_id">
            <MovieWatchProviders class="col-auto" :tmdb-id="moviePage.selectedMovie.tmdb_id" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useQuasar, QInput, QSelect } from 'quasar';

import { useMovieStore } from 'src/core/stores/MovieStore';

import MovieService from 'src/services/MovieService';

import InputText from 'src/components/shared/inputText/InputText.vue';
import ChipNote from 'src/components/shared/chipNote/ChipNote.vue';
import TooltipMovieInfo from './tooltipMovieInfo/TooltipMovieInfo.vue';
import MovieWatchProviders from 'src/components/shared/formMovieSummary/movieWatchProviders/MovieWatchProviders.vue';
import BtnDialogCast from 'src/components/shared/dialogCast/BtnDialogCast.vue';
import ContextMenuFormMovieImage from './contextMenuFormMovieImage/ContextMenuFormMovieImage.vue';

import StringUtils from 'src/utils/StringUtils';
import DateUtils from 'src/utils/DateUtils';

interface Props {
  isRegisterOrEditing: boolean;
}

const props = defineProps<Props>();

const $q = useQuasar();
const isMobile = $q.platform.is.mobile;

const inputTextPortugueseTitleRef = ref<InstanceType<typeof InputText>>();
const inputTextEnglishTitleRef = ref<InstanceType<typeof InputText>>();
const inputTextOriginalTitleRef = ref<InstanceType<typeof InputText>>();
const inputTextDirectorRef = ref<InstanceType<typeof InputText>>();
const inputTextReleaseDateRef = ref<InstanceType<typeof InputText>>();
const qInputDescriptionRef = ref<InstanceType<typeof QInput>>();
const qSelectGenresRef = ref<InstanceType<typeof QSelect>>();
const InputTextTmdbIdRef = ref<InstanceType<typeof InputText>>();
const inputTextUrlImageRef = ref<InstanceType<typeof InputText>>();
const inputTextUrlTrailerBrRef = ref<InstanceType<typeof InputText>>();
const inputTextUrlTrailerEnRef = ref<InstanceType<typeof InputText>>();
const inputTextRuntimeRef = ref<InstanceType<typeof InputText>>();

const loadingGenres = ref(false);

const movieStore = useMovieStore();
const moviePage = computed(() => movieStore?.moviePage);
const screenHeight = computed(() => $q.screen.height);

onMounted(async () => {
  await loadGenres();
});

defineExpose({ hasErrors, resetValidation });

async function loadGenres(): Promise<void> {
  try {
    loadingGenres.value = true;
    const res = await MovieService.getMoviesGenres();
    moviePage.value.genres = res;
  } finally {
    loadingGenres.value = false;
  }
}
function getImageAndAlt(): Array<string> {
  const srcImage = moviePage.value.selectedMovie.url_image;
  const altImage = moviePage.value.selectedMovie.portuguese_title;

  if (!srcImage || !altImage) {
    return ['', ''];
  }

  return [srcImage, altImage];
}
function hasErrors(): boolean {
  let hasError = false;
  if (inputTextPortugueseTitleRef.value?.hasErrors()) {
    hasError = true;
  }
  if (inputTextEnglishTitleRef.value?.hasErrors()) {
    hasError = true;
  }
  if (inputTextOriginalTitleRef.value?.hasErrors()) {
    hasError = true;
  }
  if (inputTextDirectorRef.value?.hasErrors()) {
    hasError = true;
  }
  if (inputTextReleaseDateRef.value?.hasErrors()) {
    hasError = true;
  }
  if (inputTextReleaseDateRef.value?.hasErrors()) {
    hasError = true;
  }
  if (qInputDescriptionRef.value) {
    qInputDescriptionRef.value.validate();
    hasError = qInputDescriptionRef.value.hasError || hasError;
  }
  if (qSelectGenresRef.value) {
    qSelectGenresRef.value?.validate();
    hasError = qSelectGenresRef.value?.hasError || hasError;
  }
  if (InputTextTmdbIdRef.value?.hasErrors()) {
    hasError = true;
  }
  if (inputTextUrlImageRef.value?.hasErrors()) {
    hasError = true;
  }
  if (inputTextUrlTrailerBrRef.value?.hasErrors()) {
    hasError = true;
  }
  if (inputTextUrlTrailerEnRef.value?.hasErrors()) {
    hasError = true;
  }
  if (inputTextRuntimeRef.value?.hasErrors()) {
    hasError = true;
  }
  return hasError;
}
function resetValidation(): void {
  inputTextPortugueseTitleRef.value?.resetValidation();
  inputTextEnglishTitleRef.value?.resetValidation();
  inputTextOriginalTitleRef.value?.resetValidation();
  inputTextDirectorRef.value?.resetValidation();
  inputTextReleaseDateRef.value?.resetValidation();
  inputTextReleaseDateRef.value?.resetValidation();
  qInputDescriptionRef.value?.resetValidation();
  qSelectGenresRef.value?.resetValidation();
  InputTextTmdbIdRef.value?.resetValidation();
  inputTextUrlImageRef.value?.resetValidation();
  inputTextUrlTrailerBrRef.value?.resetValidation();
  inputTextUrlTrailerEnRef.value?.resetValidation();
  inputTextRuntimeRef.value?.resetValidation();
}
function changeTrailerPortuguese(url: string) {
  const key = getYoutubeVideoKey(url);
  moviePage.value.selectedMovie.portuguese_url_trailer = key;
}
function changeTrailerEnglish(url: string) {
  const key = getYoutubeVideoKey(url);
  moviePage.value.selectedMovie.english_url_trailer = key;
}
function getYoutubeVideoKey(url: string) {
  if (!url) {
    return;
  }

  const split = url.split(/(vi\/|v=|\/b\/|youtu\.be\/|\/embed\/)/);

  const param = split[2] !== undefined ? split[2].split(/[^0-9a-z_\-]/i)[0] : split[0].split(/[^0-9a-z_\-]/i)[0];
  return param;
}
function openTmdbInNewTab() {
  if (!moviePage.value.selectedMovie.tmdb_id) {
    return;
  }
  openNewWindow(`https://www.themoviedb.org/movie/${moviePage.value.selectedMovie.tmdb_id}`);
}
function openImdbInNewTab() {
  if (!moviePage.value.selectedMovie.imdb_id) {
    return;
  }
  openNewWindow(`https://www.imdb.com/title/${moviePage.value.selectedMovie.imdb_id}`);
}
function openNewWindow(url: string) {
  const w = window.open(url);
  if (w) {
    w.focus();
  }
}
function changeReleaseDate(val: string) {
  if (val.split('/').length < 3) {
    return;
  }
  const dateChange = DateUtils.extractDate(val, 'DD/MM/YYYY');
  moviePage.value.selectedMovie.release_date = dateChange;
}
function runtimeToText() {
  return StringUtils.runtimeToText(moviePage.value.selectedMovie.runtime);
}
function showEnglishTitle() {
  return moviePage.value.selectedMovie.original_title !== moviePage.value.selectedMovie.english_title;
}
function getImgWidth() {
  if (isMobile) {
    return '200px';
  }
  if (screenHeight.value <= 1050) {
    return '350px';
  }

  return '500px';
}
function getImgHeight() {
  if (isMobile) {
    return '350px';
  }

  if (screenHeight.value <= 1050) {
    return '450px';
  }

  return '750px';
}
</script>

<style lang="scss" scoped>
.form-movie {
  height: 60vh;

  @media (max-width: 1000px) {
    height: auto !important;
  }

  img {
    border-radius: 20px;
    width: 100% !important;
    height: auto;

    transition: 0.2s ease-out;
  }
}
</style>
