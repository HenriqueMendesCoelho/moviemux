<template>
  <main>
    <div :class="$q.platform.is.mobile ? 'column q-gutter-y-md' : 'row'" v-if="showTopButtons()">
      <div class="q-ml-md">
        <q-btn style="background-color: #343c4c" text-color="white" round icon="refresh" />
      </div>
      <div class="q-ml-md" v-if="!isEditing">
        <q-btn
          style="width: 100%"
          color="primary"
          text-color="white"
          label="Editar"
          :disable="cantEdit()"
          @click="isEditing = !isEditing"
        />
        <q-tooltip v-if="cantEdit()"> O filme não foi cadastrado por você </q-tooltip>
      </div>
      <div class="q-ml-md">
        <q-btn v-if="true" style="width: 100%" color="red" text-color="white" label="Deletar" />
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
          <p class="paragrafy-title-info">Informações</p>
          <SeparatorDiv />
          <div class="col-12">
            <q-input
              standout="text-info"
              color="info"
              outlined
              v-model="selectedMovie.titleBr"
              label="Título PT-BR"
              style="background-color: #343c4c"
              dark
              :readonly="!isRegisterOrEditing()"
            />
          </div>
          <div class="col-12 q-mt-xs">
            <q-input
              standout="text-info"
              color="info"
              outlined
              v-model="selectedMovie.titleEn"
              label="Título EN"
              style="background-color: #343c4c"
              dark
              :readonly="!isRegisterOrEditing()"
            />
          </div>
          <div class="col-12 q-mt-xs">
            <q-input
              standout="text-info"
              color="info"
              outlined
              v-model="selectedMovie.year"
              label="Ano de lançamento"
              style="background-color: #343c4c"
              dark
              :readonly="!isRegisterOrEditing()"
            />
          </div>
          <div class="col-12 q-mt-xs">
            <q-input
              standout="text-info"
              color="info"
              outlined
              v-model="selectedMovie.director"
              label="Diretor"
              style="background-color: #343c4c"
              dark
              :readonly="!isRegisterOrEditing()"
            />
          </div>
          <div class="col-12 q-mt-xs">
            <q-input
              standout="text-info"
              color="info"
              outlined
              v-model="selectedMovie.image"
              label="URL da Imagem"
              style="background-color: #343c4c"
              dark
              v-if="isRegisterOrEditing()"
            />
          </div>
          <div class="col-12 q-mt-xs">
            <q-input
              standout="text-info"
              color="info"
              outlined
              v-model="selectedMovie.trailerBr"
              label="URL do trailer dublado"
              style="background-color: #343c4c"
              dark
              v-if="isRegisterOrEditing()"
            />
          </div>
          <div class="col-12 q-mt-xs">
            <q-input
              standout="text-info"
              color="info"
              outlined
              v-model="selectedMovie.trailerEn"
              label="URL do trailer legendado"
              style="background-color: #343c4c"
              dark
              v-if="isRegisterOrEditing()"
            />
          </div>
        </div>
      </div>
      <SeparatorDivSolidLine />
      <div class="container-notes-trailers">
        <div class="row movie-notes justify-center q-px-lg">
          <div class="div-textarea col-6 q-pr-xs mobile-movie-notes">
            <q-input
              standout="text-info"
              color="info"
              outlined
              v-model="selectedMovie.description"
              input-style="resize: none;"
              rows="9"
              label="Descrição - Sinopse"
              style="background-color: #343c4c"
              dark
              type="textarea"
              :readonly="!isRegisterOrEditing()"
            />
          </div>
          <div class="col-6 q-pl-xs mobile-movie-notes" v-if="!isRegisterOrEditing()">
            <TableNoHeader :title="'Notas'" :height="200" />
          </div>
        </div>
        <div class="row movie-trailers justify-center" v-if="selectedMovie.trailerBr || selectedMovie.trailerEn">
          <SeparatorDivSolidLine />
          <div class="column items-center" v-if="selectedMovie.trailerBr">
            <h6>Trailer Dublado</h6>
            <VideoEmbedded :width="$q.platform.is.mobile ? '100%' : '560px'" :url="selectedMovie.trailerBr" />
          </div>
          <SeparatorDivLineSolidVertical
            v-if="!$q.platform.is.mobile && selectedMovie.trailerBr && selectedMovie.trailerEn"
          />
          <div class="column items-center" v-if="selectedMovie.trailerEn">
            <h6>Trailer Legendado</h6>
            <VideoEmbedded :width="$q.platform.is.mobile ? '100%' : '560px'" :url="selectedMovie.trailerEn" />
          </div>
        </div>
      </div>
      <SeparatorDivSolidLine />
      <div class="row justify-center" v-if="isRegisterOrEditing()">
        <div :class="$q.platform.is.mobile ? 'col-4' : 'col-2'">
          <q-btn
            style="width: 100%"
            color="positive"
            text-color="white"
            label="Salvar"
            :disable="false"
            @click="isEditing = !isEditing"
          />
        </div>
        <div :class="$q.platform.is.mobile ? 'col-4 q-ml-md' : 'col-2 q-ml-md'">
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
import SeparatorDivLineSolidVertical from '../shared/separator/SeparatorDivLineSolidVertical.vue';
import VideoEmbedded from './videoEmbedded/VideoEmbedded.vue';

export default defineComponent({
  name: 'MovieApp',
  components: {
    SeparatorDiv,
    TableNoHeader,
    SeparatorDivSolidLine,
    SeparatorDivLineSolidVertical,
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
    ...mapState(useMovieStore, ['selectedMovie', 'allMovies']),
  },
  mounted() {
    if (this.$route.name === 'add') {
      document.title = 'Cineminha - Cadastrar Filme';
    } else {
      document.title = `Cineminha - Filme ${this.idPathParam}`;
    }
  },
  updated() {
    if (this.$route.name === 'add') {
      this.idPathParam = '';
      document.title = 'Cineminha - Cadastrar Filme';
    } else {
      document.title = `Cineminha - Filme ${this.idPathParam}`;
    }
  },
  methods: {
    ...mapActions(useMovieStore, ['resetStoreMovie']),
    isRegisterOrEditing() {
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
    cantEdit() {
      return false;
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

  @media (max-width: 768px) {
    margin-left: calc(4rem + 32px);
  }

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
    .container-notes-trailers {
      //border: solid 5px yellow;
      height: auto;

      .movie-notes {
        @media (max-width: 768px) {
          padding: 0px;
        }

        .div-textarea {
          overflow: hidden;
          max-height: 200px;

          transition: 0.2s ease-in-out;

          @media (max-width: 768px) {
            padding: 0px;
            min-width: 100%;
          }
        }

        .mobile-movie-notes {
          margin-top: 20px;

          @media (max-width: 768px) {
            width: 100%;
            justify-content: center;
            align-content: center;
          }
        }
      }

      .movie-trailers {
        @media (max-width: 768px) {
          max-width: 100%;
          overflow: hidden;
        }
      }
    }
  }
}
</style>
