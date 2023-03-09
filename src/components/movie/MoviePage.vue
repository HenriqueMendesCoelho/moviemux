<template>
  <ContainerMain>
    <div :class="isMobile ? 'column q-gutter-y-md' : 'row'">
      <SuperiorButtonsMovie />
      <SeparatorDivSolidLine />
    </div>
    <div class="container-main">
      <FormVideo :isRegisterOrEditing="isRegisterOrEditing()" />
      <SeparatorDivSolidLine />
      <NotesDescription :isRegisterOrEditing="isRegisterOrEditing()" />
      <SeparatorDivSolidLine v-if="moviePage.selectedMovie.trailerBr || moviePage.selectedMovie.trailerEn" />
      <VideoEmbedded :width="isMobile ? '100%' : '560px'" />
      <div class="row justify-center" v-if="isRegisterOrEditing()">
        <SeparatorDivSolidLine />
        <div :class="isMobile ? 'col-4' : 'col-2'">
          <q-btn
            style="width: 100%"
            color="positive"
            text-color="white"
            label="Salvar"
            :disable="false"
            @click="moviePage.isEditing = !moviePage.isEditing"
          />
        </div>
        <div :class="isMobile ? 'col-4 q-ml-md' : 'col-2 q-ml-md'">
          <q-btn style="width: 100%" color="red" text-color="white" label="Cancelar" :disable="false" @click="cancel()" />
        </div>
      </div>
    </div>
  </ContainerMain>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { RouteRecordName } from 'vue-router';
import { mapActions, mapState } from 'pinia';

import { useStyleStore } from '@/stores/StyleStore';
import { useMovieStore } from '@/stores/MovieStore';

import FormVideo from './formMovie/FormMovie.vue';
import ContainerMain from '../shared/containerMain/ContainerMain.vue';
import SeparatorDivSolidLine from '@/components/shared/separator/SeparatorDivLineSolid.vue';
import VideoEmbedded from './videoEmbedded/VideoEmbedded.vue';
import SuperiorButtonsMovie from './superiorButtonsMovie/SuperiorButtonsMovie.vue';
import NotesDescription from './notesDescriptionMovie/NotesDescription.vue';

export default defineComponent({
  name: 'MoviePage',
  components: {
    ContainerMain,
    SeparatorDivSolidLine,
    VideoEmbedded,
    SuperiorButtonsMovie,
    FormVideo,
    NotesDescription,
  },
  data() {
    return {
      idPathParam: this.$route.params.id,
      notesVisible: true,
      alreadyEditing: false,
    };
  },
  computed: {
    ...mapState(useStyleStore, ['getMarginSideBar']),
    ...mapState(useMovieStore, ['moviePage', 'allMovies']),
    routeName(): RouteRecordName | null | undefined {
      return this.$route.name;
    },
    routeIDPath(): string | string[] {
      return this.$route.params.id;
    },
    isMobile(): boolean | undefined {
      return this.$q.platform.is.mobile;
    },
  },
  mounted() {
    this.resetStoreMovie();
    if (this.routeName === 'add') {
      document.title = 'Cineminha - Cadastrar Filme';
    } else {
      document.title = `Cineminha - Filme ${this.routeIDPath}`;
    }
  },
  updated() {
    if (this.routeName === 'add') {
      if (!this.alreadyEditing) this.resetStoreMovie();
      this.alreadyEditing = true;
      this.idPathParam = '';
      document.title = 'Cineminha - Cadastrar Filme';
    } else {
      document.title = `Cineminha - Filme ${this.routeIDPath}`;
    }
  },
  methods: {
    ...mapActions(useMovieStore, ['resetStoreMovie']),
    showTopButtons() {
      return this.routeName === 'movie';
    },
    save() {
      return;
    },
    cancel() {
      //TODO:FAZER POP UP PARA CONFIRMAR O CANCELAMENTO DO CADASTRAMENTO
      this.moviePage.isEditing = false;
      if (this.idPathParam) {
        //TODO: Chamar api para pegar dados novamente pelo id do path
        return;
      }
      this.resetStoreMovie();
    },
    cantEdit() {
      return false;
    },
    copyMovieURL(url?: string) {
      if (url) {
        navigator.clipboard.writeText(url);
      }
    },
    showBtnImport() {
      if (this.routeName === 'add') {
        return true;
      }
      return this.moviePage.isEditing;
    },
    isRegisterOrEditing() {
      if (!this.routeIDPath) {
        return true;
      }
      if (this.routeIDPath && this.moviePage.isEditing) {
        return true;
      }
      return false;
    },
  },
});
</script>

<style lang="scss" scoped>
.container-main {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: auto;

  color: white;
  background: var(--grey-dark2);

  .movie-notes {
    @media (max-width: 768px) {
      padding: 0px;
    }

    .div-textarea {
      overflow: hidden;
      transition: 0.2s ease-in-out;

      @media (max-width: 768px) {
        padding: 0px;
        min-width: 100%;
      }
    }
  }
}
</style>
