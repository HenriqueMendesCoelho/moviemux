<template>
  <div class="row justify-center form-movie q-mx-md" style="overflow: auto">
    <q-img
      style="border-radius: 20px"
      class="col-3 q-mx-xl q-py-xs"
      :src="getImageAndAlt()[0]"
      :alt="getImageAndAlt()[1]"
      :draggable="false"
      :height="'100%'"
    />
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
            :required="true"
            :dense="screenHeight <= 1080"
          />
          <InputText
            ref="inputTextEnglishTitleRef"
            class="col"
            :label="'Título Inglês'"
            v-model="moviePage.selectedMovie.english_title"
            :readOnly="!isRegisterOrEditing"
            :required="true"
            :dense="screenHeight <= 1080"
          />
          <InputText
            v-if="() => moviePage.selectedMovie.original_title || isRegisterOrEditing"
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
            class="col-10"
            :label="'Diretor'"
            v-model="moviePage.selectedMovie.director"
            :readOnly="!isRegisterOrEditing"
            :required="true"
            :dense="screenHeight <= 1080"
          />
          <InputText
            ref="inputTextReleaseDateRef"
            class="col-2"
            :label="'Ano de lançamento'"
            :modelValue="moviePage.selectedMovie.release_date ? new Date(moviePage.selectedMovie.release_date).toLocaleDateString() : ''"
            @change="moviePage.selectedMovie.release_date = new Date($event)"
            :readOnly="!isRegisterOrEditing"
            :mask="'##/##/####'"
            :required="true"
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
              popup-content-style="background-color: #1f2531"
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
              :icon="'open_in_new'"
              :iconTooltip="'Abrir tmdb'"
              :iconFunction="openTmdbInNewTab"
            />
            <InputText
              class="col-12"
              :label="'Imdb ID'"
              v-model="moviePage.selectedMovie.imdb_id"
              :readOnly="!isRegisterOrEditing"
              :dense="screenHeight <= 1080"
              :icon="'open_in_new'"
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
            :required="true"
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
import { useQuasar } from 'quasar';
import { mapState } from 'pinia';

import { useMovieStore } from '@/stores/MovieStore';

import { InputTextRefType, InputValidateRefType } from '@/components/shared/inputText/types/InputValidateRefType';

import MovieService from '@/services/MovieService';
import imageUtils from '@/utils/imageUtils';

import InputText from '@/components/shared/inputText/InputText.vue';
import ChipNote from '@/components/shared/chipNote/ChipNote.vue';

export default defineComponent({
  name: 'FormVideo',
  components: { InputText, ChipNote },
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
      const srcImage =
        this.moviePage.selectedMovie.url_image ||
        'https://cdn.discordapp.com/attachments/713552377348882434/987853775450566666/unknown.png';
      const altImage = this.moviePage.selectedMovie.portuguese_title || 'img';

      return [srcImage, altImage];
    },
    hasErrors(): boolean {
      let hasError = false;
      if (this.inputTextPortugueseTitleRef) {
        hasError = this.inputTextPortugueseTitleRef.hasErrors();
      }
      if (this.inputTextEnglishTitleRef) {
        hasError = this.inputTextEnglishTitleRef.hasErrors();
      }
      if (this.inputTextOriginalTitleRef) {
        hasError = this.inputTextOriginalTitleRef.hasErrors();
      }
      if (this.inputTextDirectorRef) {
        hasError = this.inputTextDirectorRef.hasErrors();
      }
      if (this.inputTextReleaseDateRef) {
        hasError = this.inputTextReleaseDateRef.hasErrors();
      }
      if (this.inputTextReleaseDateRef) {
        hasError = this.inputTextReleaseDateRef.hasErrors();
      }
      if (this.qInputDescriptionRef) {
        this.qInputDescriptionRef.validate();
        hasError = this.qInputDescriptionRef.hasError;
      }
      if (this.qSelectGenresRef) {
        this.qSelectGenresRef.validate();
        hasError = this.qSelectGenresRef.hasError;
      }
      if (this.InputTextTmdbIdRef) {
        hasError = this.InputTextTmdbIdRef.hasErrors();
      }
      if (this.inputTextUrlImageRef) {
        hasError = this.inputTextUrlImageRef.hasErrors();
      }
      if (this.inputTextUrlTrailerBrRef) {
        hasError = this.inputTextUrlTrailerBrRef.hasErrors();
      }
      if (this.inputTextUrlTrailerEnRef) {
        hasError = this.inputTextUrlTrailerEnRef.hasErrors();
      }
      return hasError;
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
