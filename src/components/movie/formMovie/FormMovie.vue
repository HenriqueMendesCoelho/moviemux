<template>
  <div class="row justify-center form-movie q-mx-md" style="overflow: auto">
    <q-img
      style="border-radius: 20px"
      class="col-3 q-mx-xl q-py-xs"
      :src="getImageAndAlt()[0]"
      :alt="getImageAndAlt()[1]"
      :draggable="false"
      :height="'100%'"
      v-if="moviePage.selectedMovie?.url_image"
    >
      <TooltipMovieInfo />
    </q-img>
    <q-skeleton class="col-3" v-else width="600px" height="750px" animation="fade" dark bordered />
    <div class="col q-ml-xl">
      <div class="row q-col-gutter-y-md">
        <div class="col-12" :class="screenHeight > 1080 ? 'text-h3' : 'text-h4'">Informações</div>
        <div class="col-12 row q-col-gutter-sm">
          <InputText
            ref="inputTextPortugueseTitleRef"
            class="col"
            :label="'Título PT-BR'"
            v-model="moviePage.selectedMovie.portuguese_title"
            :readOnly="!isRegisterOrEditing"
            required
            :dense="screenHeight <= 1080"
          />
          <InputText
            ref="inputTextEnglishTitleRef"
            class="col"
            :label="'Título Inglês'"
            v-model="moviePage.selectedMovie.english_title"
            :readOnly="!isRegisterOrEditing"
            required
            :dense="screenHeight <= 1080"
          />
          <InputText
            v-if="showOriginalTitle()"
            ref="inputTextOriginalTitleRef"
            class="col"
            :label="'Título Original'"
            v-model="moviePage.selectedMovie.original_title"
            :readOnly="!isRegisterOrEditing"
            :dense="screenHeight <= 1080"
          />
        </div>
        <div class="col-12 row q-col-gutter-sm">
          <InputText
            ref="inputTextDirectorRef"
            class="col-8"
            :label="'Diretor'"
            v-model="moviePage.selectedMovie.director"
            :readOnly="!isRegisterOrEditing"
            required
            :dense="screenHeight <= 1080"
          />
          <InputText
            v-if="isRegisterOrEditing"
            ref="inputTextRuntimeRef"
            class="col-2"
            :label="'Tempo de duração em minutos'"
            :modelValue="moviePage.selectedMovie.runtime?.toString()"
            @change="moviePage.selectedMovie.runtime = Number($event)"
            :mask="'###'"
            required
            :dense="screenHeight <= 1080"
          />
          <InputText
            v-else
            class="col-2"
            :label="'Tempo de duração'"
            :modelValue="runtimeToText()"
            :readOnly="true"
            :dense="screenHeight <= 1080"
          />
          <InputText
            ref="inputTextReleaseDateRef"
            class="col-2"
            :label="'Ano de lançamento'"
            :modelValue="moviePage.selectedMovie.release_date ? new Date(moviePage.selectedMovie.release_date).toLocaleDateString() : ''"
            @change="changeReleaseDate"
            :readOnly="!isRegisterOrEditing"
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
          <div class="col-5 row">
            <q-select
              ref="qSelectGenresRef"
              class="col-12"
              outlined
              :options="moviePage.genres"
              v-model="moviePage.selectedMovie.genres"
              label="Generos"
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
            />
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
              :iconTooltip="'Abrir tmdb'"
              :iconFunction="openTmdbInNewTab"
            />
            <InputText
              class="col-12"
              :label="'Imdb ID'"
              v-model="moviePage.selectedMovie.imdb_id"
              :readOnly="!isRegisterOrEditing"
              :dense="screenHeight <= 1080"
              :icon="!isRegisterOrEditing ? 'open_in_new' : ''"
              :iconTooltip="'Abrir imdb'"
              :iconFunction="openImdbInNewTab"
            />
          </div>
        </div>

        <div class="col-12 row q-col-gutter-sm">
          <div class="col-12 text-h5">Urls</div>
          <InputText
            ref="inputTextUrlImageRef"
            class="col-5"
            :label="'URL da Imagem'"
            v-model="moviePage.selectedMovie.url_image"
            :readOnly="!isRegisterOrEditing"
            required
            :dense="screenHeight <= 1080"
          />
          <InputText
            ref="inputTextUrlTrailerBrRef"
            class="col"
            :label="'URL do trailer dublado'"
            :model-value="moviePage.selectedMovie.portuguese_url_trailer"
            @change="changeTrailerPortuguese"
            :readOnly="!isRegisterOrEditing"
            :customRules="!!(moviePage.selectedMovie.portuguese_url_trailer || moviePage.selectedMovie.english_url_trailer)"
            :customRulesText="'É necessário ter url do trailer dublado ou legendado'"
            :hint="isRegisterOrEditing ? 'Insira a url do youtube ou key do video' : ''"
            :dense="screenHeight <= 1080"
          />
          <InputText
            ref="inputTextUrlTrailerEnRef"
            class="col"
            :label="'URL do trailer legendado'"
            :model-value="moviePage.selectedMovie.english_url_trailer"
            @change="changeTrailerEnglish"
            :readOnly="!isRegisterOrEditing"
            :customRules="!!(moviePage.selectedMovie.portuguese_url_trailer || moviePage.selectedMovie.english_url_trailer)"
            :customRulesText="'É necessário ter url do trailer dublado ou legendado'"
            :hint="isRegisterOrEditing ? 'Insira a url do youtube ou key do video' : ''"
            :dense="screenHeight <= 1080"
          />
        </div>
        <div class="col-12 row q-col-gutter-sm" v-if="moviePage.selectedMovie.notes?.length">
          <div class="col-12 text-h5">Nota</div>
          <div class="col-12 q-pl-xs">
            <ChipNote size="xl" :movie="moviePage.selectedMovie" :dense="screenHeight <= 1080" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useQuasar, date } from 'quasar';
import { mapState } from 'pinia';

import { useMovieStore } from '@/stores/MovieStore';

import { InputTextRefType, InputValidateRefType } from '@/components/shared/inputText/types/InputValidateRefType';

import MovieService from '@/services/MovieService';
import imageUtils from '@/utils/imageUtils';

import InputText from '@/components/shared/inputText/InputText.vue';
import ChipNote from '@/components/shared/chipNote/ChipNote.vue';
import TooltipMovieInfo from './tooltipMovieInfo/TooltipMovieInfo.vue';

export default defineComponent({
  name: 'FormVideo',
  components: { InputText, ChipNote, TooltipMovieInfo },
  props: {
    isRegisterOrEditing: {
      type: Boolean,
    },
  },
  setup() {
    const $q = useQuasar();
    const inputTextPortugueseTitleRef = ref<InputTextRefType>();
    const inputTextEnglishTitleRef = ref<InputTextRefType>();
    const inputTextOriginalTitleRef = ref<InputTextRefType>();
    const inputTextDirectorRef = ref<InputTextRefType>();
    const inputTextReleaseDateRef = ref<InputTextRefType>();
    const qInputDescriptionRef = ref<InputValidateRefType>();
    const qSelectGenresRef = ref<InputValidateRefType>();
    const InputTextTmdbIdRef = ref<InputTextRefType>();
    const inputTextUrlImageRef = ref<InputTextRefType>();
    const inputTextUrlTrailerBrRef = ref<InputTextRefType>();
    const inputTextUrlTrailerEnRef = ref<InputTextRefType>();
    const inputTextRuntimeRef = ref<InputTextRefType>();

    return {
      inputTextPortugueseTitleRef,
      inputTextEnglishTitleRef,
      inputTextOriginalTitleRef,
      inputTextDirectorRef,
      inputTextReleaseDateRef,
      qInputDescriptionRef,
      qSelectGenresRef,
      InputTextTmdbIdRef,
      inputTextUrlImageRef,
      inputTextUrlTrailerBrRef,
      inputTextUrlTrailerEnRef,
      inputTextRuntimeRef,
      showError(msg: string) {
        $q.notify({
          type: 'negative',
          message: msg,
          position: 'center',
        });
      },
    };
  },
  data() {
    return {
      idPathParam: this.$route.params.id,
      loadingGenres: false,
    };
  },
  computed: {
    ...mapState(useMovieStore, ['moviePage']),
    urlImage() {
      return this.moviePage.selectedMovie.url_image;
    },
    screenHeight() {
      return this.$q.screen.height;
    },
  },
  async mounted() {
    await this.loadGenres();
  },
  methods: {
    async loadGenres(): Promise<void> {
      try {
        this.loadingGenres = true;
        const res = await MovieService.getMoviesGenres();
        this.moviePage.genres = res;
      } finally {
        this.loadingGenres = false;
      }
    },
    getImageAndAlt(): Array<string> {
      const srcImage = this.moviePage.selectedMovie.url_image;
      const altImage = this.moviePage.selectedMovie.portuguese_title;

      if (!srcImage || !altImage) {
        return ['', ''];
      }

      return [srcImage, altImage];
    },
    async hasErrors(): Promise<boolean> {
      let hasError = false;
      if (await this.inputTextPortugueseTitleRef?.hasErrors()) {
        hasError = true;
      }
      if (await this.inputTextEnglishTitleRef?.hasErrors()) {
        hasError = true;
      }
      if (await this.inputTextOriginalTitleRef?.hasErrors()) {
        hasError = true;
      }
      if (await this.inputTextDirectorRef?.hasErrors()) {
        hasError = true;
      }
      if (await this.inputTextReleaseDateRef?.hasErrors()) {
        hasError = true;
      }
      if (await this.inputTextReleaseDateRef?.hasErrors()) {
        hasError = true;
      }
      if (this.qInputDescriptionRef) {
        await this.qInputDescriptionRef.validate();
        hasError = this.qInputDescriptionRef.hasError || hasError;
      }
      if (this.qSelectGenresRef) {
        await this.qSelectGenresRef.validate();
        hasError = this.qSelectGenresRef.hasError || hasError;
      }
      if (await this.InputTextTmdbIdRef?.hasErrors()) {
        hasError = true;
      }
      if (await this.inputTextUrlImageRef?.hasErrors()) {
        hasError = true;
      }
      if (await this.inputTextUrlTrailerBrRef?.hasErrors()) {
        hasError = true;
      }
      if (await this.inputTextUrlTrailerEnRef?.hasErrors()) {
        hasError = true;
      }
      if (await this.inputTextRuntimeRef?.hasErrors()) {
        hasError = true;
      }
      return Promise.resolve(hasError);
    },
    resetValidation(): void {
      this.inputTextPortugueseTitleRef?.resetValidation();
      this.inputTextEnglishTitleRef?.resetValidation();
      this.inputTextOriginalTitleRef?.resetValidation();
      this.inputTextDirectorRef?.resetValidation();
      this.inputTextReleaseDateRef?.resetValidation();
      this.inputTextReleaseDateRef?.resetValidation();
      this.qInputDescriptionRef?.resetValidation();
      this.qSelectGenresRef?.resetValidation();
      this.InputTextTmdbIdRef?.resetValidation();
      this.inputTextUrlImageRef?.resetValidation();
      this.inputTextUrlTrailerBrRef?.resetValidation();
      this.inputTextUrlTrailerEnRef?.resetValidation();
      this.inputTextRuntimeRef?.resetValidation();
    },
    changeTrailerPortuguese(url: string) {
      const key = this.getYoutubeVideoKey(url);
      this.moviePage.selectedMovie.portuguese_url_trailer = key;
    },
    changeTrailerEnglish(url: string) {
      const key = this.getYoutubeVideoKey(url);
      this.moviePage.selectedMovie.english_url_trailer = key;
    },
    getYoutubeVideoKey(url: string) {
      const split = url.split(/(vi\/|v=|\/b\/|youtu\.be\/|\/embed\/)/);

      const param =
        // eslint-disable-next-line
        split[2] !== undefined ? split[2].split(/[^0-9a-z_\-]/i)[0] : split[0].split(/[^0-9a-z_\-]/i)[0];
      return param;
    },
    openTmdbInNewTab() {
      if (!this.moviePage.selectedMovie.tmdb_id) {
        return;
      }
      this.openNewWindow(`https://www.themoviedb.org/movie/${this.moviePage.selectedMovie.tmdb_id}`);
    },
    openImdbInNewTab() {
      if (!this.moviePage.selectedMovie.imdb_id) {
        return;
      }
      this.openNewWindow(`https://www.imdb.com/title/${this.moviePage.selectedMovie.imdb_id}`);
    },
    openNewWindow(url: string) {
      const w = window.open(url);
      if (w) {
        w.focus();
      }
    },
    changeReleaseDate(val: string) {
      if (val.split('/').length < 3) {
        return;
      }
      const dateChange = date.extractDate(val, 'DD/MM/YYYY');
      this.moviePage.selectedMovie.release_date = dateChange;
    },
    runtimeToText() {
      const runtime = this.moviePage.selectedMovie.runtime;
      if (!runtime) {
        return '0';
      }
      const hours = Math.floor(runtime / 60);
      const minutes = runtime - 60 * hours;

      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    },
    showOriginalTitle() {
      if (this.isRegisterOrEditing) {
        return true;
      }
      if (this.moviePage.selectedMovie.original_title !== this.moviePage.selectedMovie.english_title) {
        return true;
      }
      return false;
    },
  },
  watch: {
    async urlImage(url) {
      if (!url) {
        return;
      }
      try {
        const img = await imageUtils.checkImageSizeByUrl(url);

        if (!img.imgOk || img.error) {
          this.showError('A imagem deve ter 750px de altura e 500px de largura');
          this.moviePage.selectedMovie.url_image = '';
        }
        if (img.imgOk) {
          this.moviePage.selectedMovie.url_image = url;
        }
      } catch {
        this.moviePage.selectedMovie.url_image = '';
        this.showError('Insira uma url válida para a imagem');
      }
    },
  },
});
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
