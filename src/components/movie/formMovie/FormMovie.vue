<template>
  <div class="row justify-center form-movie items-center q-mx-md">
    <img class="q-mx-xl q-py-xs" :src="getImageAndAlt()[0]" :alt="getImageAndAlt()[1]" draggable="false" @contextmenu.prevent />
    <div class="col q-ml-xl">
      <div class="row q-col-gutter-y-md">
        <div class="col-12 text-h2">Informações</div>
        <div class="col-12 row q-gutter-sm">
          <InputText
            ref="inputTextPortugueseTitleRef"
            class="col"
            :label="'Título PT-BR'"
            v-model="moviePage.selectedMovie.portuguese_title"
            :readOnly="!isRegisterOrEditing"
            :required="true"
          />
          <InputText
            ref="inputTextEnglishTitleRef"
            class="col"
            :label="'Título Inglês'"
            v-model="moviePage.selectedMovie.english_title"
            :readOnly="!isRegisterOrEditing"
            :required="true"
          />
          <InputText
            v-if="() => moviePage.selectedMovie.original_title || isRegisterOrEditing"
            ref="inputTextOriginalTitleRef"
            class="col"
            :label="'Título Original'"
            v-model="moviePage.selectedMovie.original_title"
            :readOnly="!isRegisterOrEditing"
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
            rows="9"
            label="Descrição - Sinopse"
            bg-color="grey-mid2"
            dark
            type="textarea"
            :readonly="!isRegisterOrEditing"
            :rules="[(val) => !!val || '*Obrigatório']"
            :lazy-rules="true"
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
            />
            <InputText
              ref="inputTextTmdbIdRef"
              class="col-12"
              :label="'Tmdb ID'"
              :modelValue="`${moviePage.selectedMovie.tmdb_id}`"
              @update:modelValue="moviePage.selectedMovie.tmdb_id = parseInt($event)"
              type="number"
              :readonly="true"
            />
            <InputText class="col-12" :label="'Imdb ID'" v-model="moviePage.selectedMovie.imdb_id" :readOnly="!isRegisterOrEditing" />
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
          />
          <InputText
            ref="inputTextUrlTrailerBrRef"
            class="col"
            :label="'URL do trailer dublado'"
            v-model="moviePage.selectedMovie.portuguese_url_trailer"
            :readOnly="!isRegisterOrEditing"
            :customRules="!!(moviePage.selectedMovie.portuguese_url_trailer || moviePage.selectedMovie.english_url_trailer)"
            :customRulesText="'É necessário ter url do trailer dublado ou legendado'"
          />
          <InputText
            ref="inputTextUrlTrailerEnRef"
            class="col"
            :label="'URL do trailer legendado'"
            v-model="moviePage.selectedMovie.english_url_trailer"
            :readOnly="!isRegisterOrEditing"
            :customRules="!!(moviePage.selectedMovie.portuguese_url_trailer || moviePage.selectedMovie.english_url_trailer)"
            :customRulesText="'É necessário ter url do trailer dublado ou legendado'"
          />
        </div>
        <div class="col-12 row q-col-gutter-sm q-mt-xs" v-if="moviePage.selectedMovie.notes?.length">
          <div class="col-12 text-h5">Nota</div>
          <div class="col-12 q-pl-xs">
            <q-chip size="xl" square :color="getChipColor()[0]" text-color="white" :icon-right="getChipColor()[1]">
              {{ getNoteAverage() }}
            </q-chip>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { mapState } from 'pinia';

import { useMovieStore } from '@/stores/MovieStore';

import { InputTextRefType, InputValidateRefType } from '@/components/shared/inputText/types/InputValidateRefType';

import MovieService from '@/services/MovieService';

import InputText from '@/components/shared/inputText/InputText.vue';

export default defineComponent({
  name: 'FormVideo',
  components: { InputText },
  props: {
    isRegisterOrEditing: {
      type: Boolean,
    },
  },
  setup() {
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
    getNoteAverage() {
      if (!this.moviePage.selectedMovie?.notes?.length) {
        return 0;
      }
      let sum = 0;
      let count = 0;
      for (const note of this.moviePage.selectedMovie.notes) {
        sum += note.note;
        count++;
      }
      return sum / count;
    },
    getChipColor() {
      const averageNote = this.getNoteAverage();

      if (averageNote === null || averageNote === undefined) {
        return ['grey', 'sym_o_star', 'white'];
      }

      if (averageNote <= 5) {
        return ['negative', 'sym_o_star'];
      }

      if (averageNote > 5 && averageNote <= 7) {
        return ['orange', 'star_half'];
      }

      if (averageNote > 7 && averageNote <= 9) {
        return ['positive', 'star'];
      }

      if (averageNote === 10) {
        return ['kb-primary', 'hotel_class'];
      }

      return ['grey', 'sym_o_star'];
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
    max-height: 100% !important;

    transition: 0.2s ease-out;

    &:hover {
      transform: scale(1.01);
    }

    @media (max-width: 768px) {
      max-width: 100%;
      height: auto;
    }
  }
}
</style>
