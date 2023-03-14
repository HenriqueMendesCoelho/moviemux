<template>
  <div class="container-infos-img">
    <img
      :src="moviePage.selectedMovie.url_image || 'https://cdn.discordapp.com/attachments/713552377348882434/987853775450566666/unknown.png'"
      :alt="moviePage.selectedMovie.portuguese_title || 'img'"
      draggable="false"
    />
    <div class="row movie-infos-inputs">
      <p class="paragrafy-title-info">Informações</p>
      <SeparatorDiv />
      <div class="col-12">
        <InputText :label="'Título PT-BR'" v-model="moviePage.selectedMovie.portuguese_title" :readOnly="!isRegisterOrEditing" />
      </div>
      <div class="col-12">
        <InputText :label="'Título EN'" v-model="moviePage.selectedMovie.english_title" :readOnly="!isRegisterOrEditing" />
      </div>
      <div class="col-12">
        <InputText
          :label="'Ano de lançamento'"
          :modelValue="moviePage.selectedMovie.release_date?.toLocaleDateString()"
          @change="moviePage.selectedMovie.release_date = new Date($event)"
          :readOnly="!isRegisterOrEditing"
          :mask="'##/##/####'"
        />
      </div>
      <div class="col-12">
        <InputText :label="'Diretor'" v-model="moviePage.selectedMovie.director" :readOnly="!isRegisterOrEditing" />
      </div>
      <div class="col-12">
        <InputText :label="'URL da Imagem'" v-model="moviePage.selectedMovie.url_image" :readOnly="!isRegisterOrEditing" />
      </div>
      <div class="col-12">
        <InputText
          :label="'URL do trailer dublado'"
          v-model="moviePage.selectedMovie.portuguese_url_trailer"
          :readOnly="!isRegisterOrEditing"
        />
      </div>
      <div class="col-12">
        <InputText
          :label="'URL do trailer legendado'"
          v-model="moviePage.selectedMovie.english_url_trailer"
          :readOnly="!isRegisterOrEditing"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapState } from 'pinia';

import { useMovieStore } from '@/stores/MovieStore';

import InputText from '@/components/shared/inputText/InputText.vue';

export default defineComponent({
  name: 'FormVideo',
  components: { InputText },
  props: {
    isRegisterOrEditing: {
      type: Boolean,
    },
  },
  data() {
    return {
      idPathParam: this.$route.params.id,
    };
  },
  computed: {
    ...mapState(useMovieStore, ['moviePage']),
  },
});
</script>

<style lang="scss" scoped>
.container-infos-img {
  display: flex;
  height: 60vh;
  overflow: hidden;
  padding: 15px 15px;

  img {
    border-radius: 20px;
    height: 100%;

    @media (max-width: 768px) {
      height: auto;
    }
  }

  @media (max-width: 768px) {
    flex-direction: column;
    height: auto;
    padding: 0px;
  }

  .paragrafy-title-info {
    font-size: 50pt;

    @media (max-width: 768px) {
      font-size: x-large;
    }
  }

  .movie-infos-inputs {
    display: flex;
    flex-wrap: wrap;
    text-align: flex-start;
    justify-content: flex-start;
    width: 100%;
    height: 100%;
    margin-left: 10px;
    overflow-y: auto;
    padding-right: 10px;
  }
}
</style>
