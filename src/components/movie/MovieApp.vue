<template>
  <main>
    <div class="row" v-if="showTopButtons()">
      <div class="q-ml-md">
        <q-btn
          style="background-color: #343c4c"
          text-color="white"
          round
          icon="refresh"
        />
      </div>
      <div class="q-ml-md" v-if="!isEditing">
        <q-btn
          style="width: 100%"
          color="primary"
          text-color="white"
          label="Editar"
          :disable="false"
          @click="isEditing = !isEditing"
        />
        <q-tooltip v-if="false">
          O filme não foi cadastrado por você
        </q-tooltip>
      </div>
      <div class="q-ml-md">
        <q-btn
          v-if="true"
          style="width: 100%"
          color="red"
          text-color="white"
          label="Deletar"
        />
      </div>
      <SeparatorDivSolidLine />
    </div>
    <div class="container-main">
      <div class="container-infos-img">
        <img
          :src="
            selectedMovie.image
              ? selectedMovie.image
              : 'https://cdn.discordapp.com/attachments/713552377348882434/987853775450566666/unknown.png'
          "
          :alt="selectedMovie.titleEn ? selectedMovie.titleEn : 'placeholder'"
          draggable="false"
        />

        <div class="row movie-infos-inputs">
          <h2>Informações</h2>
          <SeparatorDiv />
          <div class="col-12">
            <q-input
              standout="text-white "
              outlined
              v-model="selectedMovie.titleBr"
              label="Título PT-BR"
              style="background-color: #343c4c"
              dark
              :readonly="false"
            />
          </div>
          <div class="col-12 q-mt-xs">
            <q-input
              standout="text-white "
              outlined
              v-model="selectedMovie.titleEn"
              label="Título EN"
              style="background-color: #343c4c"
              dark
            />
          </div>
          <div class="col-12 q-mt-xs">
            <q-input
              standout="text-white "
              outlined
              v-model="selectedMovie.year"
              label="Ano de lançamento"
              style="background-color: #343c4c"
              dark
            />
          </div>
          <div class="col-12 q-mt-xs">
            <q-input
              standout="text-white "
              outlined
              v-model="selectedMovie.director"
              label="Diretor"
              style="background-color: #343c4c"
              dark
            />
          </div>
          <div class="col-12 q-mt-xs">
            <q-input
              standout="text-white "
              outlined
              v-model="selectedMovie.image"
              label="URL da Imagem"
              style="background-color: #343c4c"
              dark
              v-if="showInputsRegister()"
            />
          </div>
          <div class="col-12 q-mt-xs">
            <q-input
              standout="text-white "
              outlined
              v-model="selectedMovie.trailerBr"
              label="URL do trailer dublado"
              style="background-color: #343c4c"
              dark
              v-if="showInputsRegister()"
            />
          </div>
          <div class="col-12 q-mt-xs">
            <q-input
              standout="text-white "
              outlined
              v-model="selectedMovie.trailerEn"
              label="URL do trailer legendado"
              style="background-color: #343c4c"
              dark
              v-if="showInputsRegister()"
            />
          </div>
        </div>
      </div>
      <SeparatorDivSolidLine />
      <div class="container-notes-trailers">
        <div class="row movie-notes justify-center q-px-lg">
          <div class="div-textarea col-6 q-pr-xs">
            <q-input
              standout="text-white "
              outlined
              v-model="selectedMovie.description"
              input-style="resize: none;"
              rows="9"
              label="Descrição - Sinopse"
              style="background-color: #343c4c"
              dark
              type="textarea"
            />
          </div>
          <div class="col-6 q-pl-xs" v-if="!showInputsRegister()">
            <TableNoHeader :title="'Notas'" :height="200" />
          </div>
        </div>
        <div
          class="row movie-trailers justify-center"
          v-if="selectedMovie.trailerBr || selectedMovie.trailerEn"
        >
          <SeparatorDivSolidLine />
          <div class="column items-center">
            <h6>Trailer Dublado</h6>
            <VideoEmbedded :url="selectedMovie.trailerBr" />
          </div>
          <div
            v-if="selectedMovie.trailerBr && selectedMovie.trailerEn"
            style="border-left: solid 1px rgba(189, 195, 199, 0.15)"
          ></div>
          <div class="column items-center">
            <h6>Trailer Legendado</h6>
            <VideoEmbedded :url="selectedMovie.trailerEn" />
          </div>
        </div>
      </div>
      <SeparatorDivSolidLine />
      <div class="row justify-center" v-if="showInputsRegister()">
        <div class="col-2">
          <q-btn
            style="width: 100%"
            color="positive"
            text-color="white"
            label="Salvar"
            :disable="false"
            @click="isEditing = !isEditing"
          />
        </div>
        <div class="col-2 q-ml-md">
          <q-btn
            style="width: 100%"
            color="red"
            text-color="white"
            label="Cancelar"
            :disable="false"
            @click="cancel()"
          />
        </div>
      </div>
    </div>
  </main>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import { mapActions, mapState } from 'pinia';
import { useStyleStore } from '@/stores/StyleStore';
import { useMovieStore } from '@/stores/MovieStore';

import TableNoHeader from '@/components/shared/tables/TableStylized.vue';
import SeparatorDiv from '@/components/shared/separator/SeparatorDiv.vue';
import SeparatorDivSolidLine from '@/components/shared/separator/SeparatorDivLineSolid.vue';
import VideoEmbedded from './videoEmbedded/VideoEmbedded.vue';

export default defineComponent({
  name: 'MovieApp',
  components: {
    SeparatorDiv,
    TableNoHeader,
    SeparatorDivSolidLine,
    VideoEmbedded,
  },
  data() {
    return {
      idPathParam: this.$route.params.id,
      notesVisible: true,
      isEditing: false,
    };
  },
  computed: {
    ...mapState(useStyleStore, ['getMarginSideBar']),
    ...mapState(useMovieStore, ['selectedMovie']),
  },
  updated() {
    if (this.$route.name === 'add') {
      this.idPathParam = '';
      //TODO: Insert code to reset all field of movie store, because in this moment user switch to addMovie
    }
  },
  methods: {
    ...mapActions(useMovieStore, ['resetStoreMovie']),
    showInputsRegister() {
      if (!this.idPathParam) {
        return true;
      }
      if (this.idPathParam && this.isEditing) {
        return true;
      }
      return false;
    },
    showTopButtons() {
      return this.$route.name === 'movie';
    },
    save() {
      return;
    },
    cancel() {
      this.isEditing = false;
      if (this.idPathParam) {
        //TODO: Chamar api para pegar dados novamente pelo id do path
        return;
      }
      this.resetStoreMovie();
    },
  },
});
</script>

<style lang="scss" scoped>
main {
  display: flex;
  flex-direction: column;

  margin-top: 1.5rem;
  margin-left: v-bind(getMarginSideBar);

  max-width: 100%;
  min-height: calc(100vh - 1.5rem);

  transition: 0.2s ease-out;

  border-top-left-radius: 10px;
  background: var(--grey-dark2);
  box-shadow: 0 10px 30px var(--shadow);

  .container-main {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: auto;

    color: white;
    background: var(--grey-dark2);

    .container-infos-img {
      display: flex;
      height: 60vh;
      overflow: hidden;
      padding: 15px 15px;

      img {
        border-radius: 20px;
        height: 100%;
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
    .container-notes-trailers {
      //border: solid 5px yellow;
      height: auto;
      .div-textarea {
        overflow: hidden;
        max-height: 200px;

        transition: 0.2s ease-in-out;
      }
    }
  }
}
</style>
