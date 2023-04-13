<template>
  <ContainerMain>
    <div :class="isMobile ? 'column q-gutter-y-md' : 'row'">
      <SuperiorButtonsMovie />
      <SeparatorDivSolidLine />
    </div>
    <div class="container-main">
      <FormMovie ref="formMovieRef" :isRegisterOrEditing="isRegisterOrEditing()" />
      <MovieNotesTable :isRegisterOrEditing="isRegisterOrEditing()" :movie-id="routeIDPath" />
      <VideoEmbedded :width="isMobile ? '100%' : '560px'" />
      <div class="row justify-center" v-if="isRegisterOrEditing()">
        <SeparatorDivSolidLine />
        <div :class="isMobile ? 'col-4' : 'col-2'">
          <q-btn style="width: 100%" color="positive" text-color="white" label="Salvar" :disable="false" @click="save()" />
        </div>
        <div :class="isMobile ? 'col-4 q-ml-md' : 'col-2 q-ml-md'">
          <q-btn
            style="width: 100%"
            color="red"
            text-color="white"
            label="Cancelar"
            :disable="!selectedMovieHasAnyFieldFilled()"
            @click="showConfirmDialogCancel()"
          />
        </div>
      </div>
    </div>
    <ImportMovie :visible="moviePage.showImportMovieDialog" :moviePathId="routeIDPath" />
    <ConfirmDialog ref="confirmDialogRef" @ok="resetForm()" />
  </ContainerMain>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { RouteRecordName } from 'vue-router';
import { useQuasar } from 'quasar';
import { mapActions, mapState } from 'pinia';

import { useStyleStore } from '@/stores/StyleStore';
import { useMovieStore } from '@/stores/MovieStore';

import { ConfirmDialogRefType } from '../shared/confirmDialog/types/ConfirmDialogType';

import MovieService from '@/services/MovieService';

import FormMovie from './formMovie/FormMovie.vue';
import ContainerMain from '../shared/containerMain/ContainerMain.vue';
import SeparatorDivSolidLine from '@/components/shared/separator/SeparatorDivLineSolid.vue';
import VideoEmbedded from './videoEmbedded/VideoEmbedded.vue';
import SuperiorButtonsMovie from './superiorButtonsMovie/SuperiorButtonsMovie.vue';
import MovieNotesTable from './movieNotesTable/MovieNotesTable.vue';
import ImportMovie from './importMovie/ImportMovie.vue';
import ConfirmDialog from '@/components/shared/confirmDialog/ConfirmDialog.vue';
import Movie from '@/domain/movie/movie';

export default defineComponent({
  name: 'MoviePage',
  components: {
    ContainerMain,
    SeparatorDivSolidLine,
    VideoEmbedded,
    SuperiorButtonsMovie,
    FormMovie,
    MovieNotesTable,
    ImportMovie,
    ConfirmDialog,
  },
  setup() {
    const $q = useQuasar();
    const confirmDialogRef = ref<ConfirmDialogRefType>();
    const formMovieRef = ref<{
      hasErrors: () => Promise<boolean>;
      resetValidation: () => void;
    }>();
    return {
      confirmDialogRef,
      formMovieRef,
      showLoading() {
        $q.loading.show({
          spinnerColor: 'kb-primary',
        });
      },
      hideLoading() {
        $q.loading.hide();
      },
      showSuccess(msg: string) {
        $q.notify({
          type: 'positive',
          message: msg,
          position: 'top',
        });
      },
      showError(msg: string) {
        $q.notify({
          type: 'negative',
          message: msg,
          position: 'top',
        });
      },
    };
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
    ...mapState(useMovieStore, ['moviePage']),
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
  async mounted() {
    await this.loadMovie();
    if (this.routeName === 'add') {
      this.resetForm();
    }
    return Promise.resolve();
  },
  async beforeUpdate() {
    if (this.routeName === 'add') {
      if (!this.alreadyEditing) {
        this.resetForm();
      }
      this.alreadyEditing = true;
      this.idPathParam = '';
      return;
    }
    await this.loadMovie();
    this.setDocumentTitle();
    return;
  },
  methods: {
    ...mapActions(useMovieStore, ['resetSelectedMovie', 'selectedMovieHasAnyFieldFilled']),
    showTopButtons() {
      return this.routeName === 'movie';
    },
    async save(): Promise<void> {
      if (await this.formMovieRef?.hasErrors()) {
        return;
      }
      const movie = { ...this.moviePage.selectedMovie };
      const request = { ...this.moviePage.selectedMovie, genres: movie.genres?.map((g) => g.id) };
      if (!request) {
        return;
      }

      try {
        this.showLoading();
        let res: Movie;
        if (request.id) {
          this.moviePage.isEditing = !this.moviePage.isEditing;
          res = await MovieService.updateMovie(request);
          this.moviePage.selectedMovie = res;
        } else {
          window.scrollTo(0, 0);
          res = await MovieService.createMovie(request);
          this.resetForm();
          this.showNotifyMovie(res.portuguese_title, res.id);
        }
        this.showSuccess('Filme foi salvo com sucesso');
      } catch {
        this.showError('Erro ao salvar filme');
      } finally {
        this.hideLoading();
      }
      return Promise.resolve();
    },
    showConfirmDialogCancel() {
      this.confirmDialogRef?.dialog(
        `Caso cancele todos os dados serão limpos. Você quer cancelar? `,
        'cancel',
        'Confirme o cancelamento',
        'Sim'
      );
    },
    resetForm() {
      const movieStore = useMovieStore();
      movieStore.$reset();
      this.moviePage.isEditing = false;
      this.formMovieRef?.resetValidation();
    },
    cantEdit() {
      return false;
    },
    copyMovieURL(url?: string) {
      if (url) {
        navigator.clipboard.writeText(url);
      }
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
    setDocumentTitle() {
      if (this.routeName === 'add') {
        document.title = 'Cineminha - Cadastrar Filme';
      } else {
        document.title = `Cineminha - ${this.moviePage.selectedMovie.portuguese_title}`;
      }
    },
    async loadMovie(): Promise<void> {
      if (!this.routeIDPath) {
        return Promise.resolve();
      }
      const res = await MovieService.getMovie(this.routeIDPath.toString());
      this.moviePage.selectedMovie = res;
      this.setDocumentTitle();
      return Promise.resolve();
    },
    showNotifyMovie(movieTitle?: string, movieId?: string) {
      if (!movieTitle || !movieId) {
        return;
      }
      this.$q.notify({
        progress: true,
        message: `Acesse o filme '${movieTitle}' que acabou de cadastrar!`,
        multiLine: true,
        position: 'bottom-left',
        color: 'grey-mid2',
        timeout: 10000,
        actions: [
          {
            label: 'Acessar',
            color: 'kb-primary',
            handler: () => {
              this.$router.push(`/movie/${movieId}`);
            },
          },
        ],
      });
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
