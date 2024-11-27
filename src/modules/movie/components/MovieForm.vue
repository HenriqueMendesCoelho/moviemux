<template>
  <div class="row justify-center scroll overflow-hidden-x" :class="!isMobile && 'q-mx-md'">
    <div class="col-md-4 col-xs-12 q-px-lg text-center justify-center row">
      <q-img
        v-if="moviePage.selectedMovie?.url_image"
        class="col-12"
        style="border-radius: 20px"
        :src="getImageAndAlt()[0]"
        :alt="getImageAndAlt()[1]"
        :draggable="false"
        :width="getImgWidth()"
        :height="getImgHeight()"
      >
        <MovieContextMenuImage v-if="useUserStore().isAdmin" />
        <MovieTooltipInfo />
      </q-img>
      <q-skeleton v-else :width="getImgWidth()" :height="getImgHeight()" animation="fade" dark bordered />
    </div>
    <div class="col-md-8 col-xs-12">
      <q-form ref="formRef">
        <div class="row" :class="screenHeight > 1080 ? 'q-col-gutter-y-lg' : 'q-col-gutter-y-sm'">
          <div class="col-12 text-title-responsive-2">Informações</div>
          <div class="col-12 row q-col-gutter-sm">
            <BaseTextInput
              ref="inputTextPortugueseTitleRef"
              class="col-md col-xs-12"
              :label="'Título PT-BR'"
              v-model="moviePage.selectedMovie.portuguese_title"
              :readonly="props.readonly"
              required
              :dense="screenHeight <= 1080"
            />
            <BaseTextInput
              v-if="showEnglishTitle()"
              ref="inputTextEnglishTitleRef"
              class="col-md col-xs-12"
              :label="'Título Inglês'"
              v-model="moviePage.selectedMovie.english_title"
              :readonly="props.readonly"
              required
              :dense="screenHeight <= 1080"
            />
            <BaseTextInput
              ref="inputTextOriginalTitleRef"
              class="col-md col-xs-12"
              :label="'Título Original'"
              v-model="moviePage.selectedMovie.original_title"
              :readonly="props.readonly"
              :dense="screenHeight <= 1080"
            />
          </div>
          <div class="col-12 row q-col-gutter-sm">
            <BaseTextInput
              ref="inputTextDirectorRef"
              class="col-md-8 col-xs-12"
              :label="'Diretor'"
              v-model="moviePage.selectedMovie.director"
              :readonly="props.readonly"
              required
              :dense="screenHeight <= 1080"
            />
            <BaseTextInput
              v-if="!props.readonly"
              ref="inputTextRuntimeRef"
              class="col-md-2 col-xs-6"
              :label="'Tempo de duração em minutos'"
              :modelValue="moviePage.selectedMovie.runtime?.toString()"
              @change="moviePage.selectedMovie.runtime = Number($event)"
              :mask="'###'"
              required
              :dense="screenHeight <= 1080"
            />
            <BaseTextInput
              v-else
              class="col-md-2 col-xs-6"
              :label="'Tempo de duração'"
              :modelValue="runtimeToText()"
              :readonly="true"
              :dense="screenHeight <= 1080"
            />
            <BaseTextInput
              ref="inputTextReleaseDateRef"
              class="col-md-2 col-xs-6"
              :label="'Ano de lançamento'"
              :modelValue="DateUtils.toLocaleDateString(moviePage.selectedMovie.release_date)"
              @change="changeReleaseDate"
              :readonly="props.readonly"
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
              :readonly="props.readonly"
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
                :readonly="props.readonly"
                :lazy-rules="true"
                :dense="screenHeight <= 1080"
                use-chips
              >
                <template v-slot:selected-item="scope">
                  <q-chip
                    :removable="!props.readonly"
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
              <BaseTextInput
                ref="inputTextTmdbIdRef"
                class="col-12"
                :label="'Tmdb ID'"
                :modelValue="`${moviePage.selectedMovie.tmdb_id}`"
                @update:modelValue="moviePage.selectedMovie.tmdb_id = parseInt($event)"
                type="number"
                :readonly="true"
                :dense="screenHeight <= 1080"
                :icon="props.readonly ? 'open_in_new' : ''"
                :icon-tooltip="'Abrir TMDB'"
                icon-cursor="pointer"
                @iconClick="openTmdbInNewTab"
              />
              <BaseTextInput
                class="col-12"
                :label="'Imdb ID'"
                v-model="moviePage.selectedMovie.imdb_id"
                :readonly="props.readonly"
                :dense="screenHeight <= 1080"
                :icon="props.readonly ? 'open_in_new' : ''"
                icon-tooltip="Abrir IMDB"
                icon-cursor="pointer"
                @iconClick="openImdbInNewTab"
              />
            </div>
          </div>

          <div class="col-12 row q-col-gutter-x-sm">
            <div class="col-12 text-title-responsive-2">Urls</div>
            <BaseTextInput
              ref="inputTextUrlImageRef"
              class="col-5"
              :label="'URL da Imagem'"
              v-model="moviePage.selectedMovie.url_image"
              :readonly="props.readonly"
              required
              :dense="screenHeight <= 1080"
            />
            <BaseTextInput
              ref="inputTextUrlTrailerBrRef"
              class="col"
              :label="'URL do trailer dublado'"
              :model-value="moviePage.selectedMovie.portuguese_url_trailer"
              @change="changeTrailerPortuguese"
              :readonly="props.readonly"
              :customRules="
                () =>
                  !!(moviePage.selectedMovie.portuguese_url_trailer || moviePage.selectedMovie.english_url_trailer) ||
                  'É necessário ter url do trailer dublado ou legendado'
              "
              :hint="!props.readonly ? 'Insira a url do youtube ou key do video' : ''"
              :dense="screenHeight <= 1080"
            />
            <BaseTextInput
              ref="inputTextUrlTrailerEnRef"
              class="col"
              :label="'URL do trailer legendado'"
              :model-value="moviePage.selectedMovie.english_url_trailer"
              @change="changeTrailerEnglish"
              :readonly="props.readonly"
              :customRules="
                () =>
                  !!(moviePage.selectedMovie.portuguese_url_trailer || moviePage.selectedMovie.english_url_trailer) ||
                  'É necessário ter url do trailer dublado ou legendado'
              "
              :hint="!props.readonly ? 'Insira a url do youtube ou key do video' : ''"
              :dense="screenHeight <= 1080"
            />
          </div>
          <div class="col-12 row q-col-gutter-md">
            <div class="col-auto" v-if="moviePage.selectedMovie.notes?.length && moviePage.selectedMovie.show_notes">
              <div class="text-h6">Nota</div>
              <BaseChipNote :size="isMobile ? 'lg' : 'xl'" :movie="moviePage.selectedMovie" :dense="screenHeight <= 1080" />
            </div>
            <div class="col-auto">
              <BaseDialogCast :movie-id="moviePage.selectedMovie.tmdb_id" />
            </div>
            <div class="col offset-1 row justify-end" v-if="moviePage.selectedMovie.tmdb_id">
              <BaseMovieWatchProviders class="col-auto" :tmdb-id="moviePage.selectedMovie.tmdb_id" />
            </div>
          </div>
        </div>
      </q-form>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, nextTick } from 'vue';
import { useQuasar, QInput, QSelect, QForm } from 'quasar';

import BaseTextInput from 'src/core/components/BaseTextInput.vue';
import BaseChipNote from 'src/core/components/BaseChipNote.vue';
import BaseMovieWatchProviders from 'src/core/components/BaseMovieWatchProviders.vue';
import BaseDialogCast from 'src/core/components/BaseBtnDialogCast.vue';

import MovieContextMenuImage from './MovieContextMenuImage.vue';
import MovieTooltipInfo from './MovieTooltipInfo.vue';

import { useMovieStore } from '../stores/MovieStore';
import { useUserStore } from 'src/core/stores/UserStore';

import MovieService from 'src/core/services/MovieService';

import StringUtils from 'src/core/utils/StringUtils';
import DateUtils from 'src/core/utils/DateUtils';

const props = withDefaults(
  defineProps<{
    readonly?: boolean;
  }>(),
  {
    readonly: false,
  }
);

const $q = useQuasar();
const isMobile = $q.platform.is.mobile;

const formRef = ref<InstanceType<typeof QForm>>();

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
async function hasErrors(): Promise<boolean> {
  return (await formRef.value?.validate(true)) === false;
}
function resetValidation(): void {
  nextTick(() => formRef.value?.resetValidation());
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
