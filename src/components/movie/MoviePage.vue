<template>
  <ContainerMain>
    <div>
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
            :disable="!movieStore.selectedMovieHasAnyFieldFilled()"
            @click="showConfirmDialogCancel()"
          />
        </div>
      </div>
    </div>
    <ImportMovie :visible="moviePage.showImportMovieDialog" />
    <ConfirmDialog ref="confirmDialogRef" @ok="cancel()" />
  </ContainerMain>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUpdate } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar, useMeta } from 'quasar';

import { useMovieStore } from 'src/stores/MovieStore';
import { useStyleStore } from 'src/stores/StyleStore';

import MovieService from 'src/services/MovieService';

import FormMovie from './formMovie/FormMovie.vue';
import ContainerMain from '../shared/containerMain/ContainerMain.vue';
import SeparatorDivSolidLine from 'src/components/shared/separator/SeparatorDivLineSolid.vue';
import VideoEmbedded from './videoEmbedded/VideoEmbedded.vue';
import SuperiorButtonsMovie from './superiorButtonsMovie/SuperiorButtonsMovie.vue';
import MovieNotesTable from './movieNotesTable/MovieNotesTable.vue';
import ImportMovie from './importMovie/ImportMovie.vue';
import ConfirmDialog from 'src/components/shared/confirmDialog/ConfirmDialog.vue';
import Movie from 'src/domain/movie/movie';

const $q = useQuasar();
const confirmDialogRef = ref<InstanceType<typeof ConfirmDialog>>();
const formMovieRef = ref<{
  hasErrors: () => boolean;
  resetValidation: () => void;
}>();

const route = useRoute();
const router = useRouter();

const movieStore = useMovieStore();

const idPathParam = ref(route.params.id?.toString());
const alreadyEditing = ref(false);

const moviePage = computed(() => movieStore.moviePage);
const routeName = computed(() => route.name);
const routeIDPath = computed(() => route.params.id?.toString());
const isMobile = computed(() => $q.platform.is.mobile);

const styleStore = useStyleStore();
const scrollToTop = () => styleStore.scrollToContainer(0, 0, 'smooth');

onMounted(async () => {
  setDocumentTitle();
  await loadMovie();
  if (routeName.value === 'add') {
    resetForm();
  }
  if (routeName.value === 'movie') {
    moviePage.value.isEditing = false;
  }
  return;
});

onBeforeUpdate(async () => {
  setDocumentTitle();
  if (routeName.value === 'add') {
    if (!alreadyEditing.value) {
      resetForm();
    }
    alreadyEditing.value = true;
    idPathParam.value = '';
    return;
  }
  await loadMovie();
  return;
});

function showLoading() {
  $q.loading.show({
    spinnerColor: 'kb-primary',
  });
}
function hideLoading() {
  $q.loading.hide();
}
function showSuccess(msg: string) {
  $q.notify({
    type: 'positive',
    message: msg,
    position: 'top',
  });
}
function showError(msg: string) {
  $q.notify({
    type: 'negative',
    message: msg,
    position: 'top',
  });
}

async function save(): Promise<void> {
  if (formMovieRef.value?.hasErrors()) {
    return;
  }
  const movie = { ...moviePage.value.selectedMovie };
  const request = { ...moviePage.value.selectedMovie, genres: movie.genres?.map((g: { id: number }) => g.id) };
  if (!request) {
    return;
  }

  try {
    showLoading();
    let res: Movie;
    if (request.id) {
      moviePage.value.isEditing = !moviePage.value.isEditing;
      res = await MovieService.updateMovie(request);
      moviePage.value.selectedMovie = res;
    } else {
      scrollToTop();
      res = await MovieService.createMovie(request);
      resetForm();
      showNotifyMovie(res.portuguese_title, res.id);
    }
    showSuccess('Filme foi salvo com sucesso');
  } catch {
    showError('Erro ao salvar filme');
  } finally {
    hideLoading();
  }
}
function showConfirmDialogCancel() {
  confirmDialogRef.value?.dialog(
    'Caso cancele todos os dados serão limpos. Você quer cancelar? ',
    'cancel',
    'Confirme o cancelamento',
    'Sim'
  );
}
function resetForm() {
  movieStore.$reset();
  moviePage.value.isEditing = false;
  formMovieRef.value?.resetValidation();
}
function isRegisterOrEditing() {
  if (!routeIDPath.value) {
    return true;
  }
  if (routeIDPath.value && moviePage.value.isEditing) {
    return true;
  }
  return false;
}
function setDocumentTitle() {
  if (routeName.value === 'movie') {
    useMeta({
      title: `Cineminha - ${moviePage.value.selectedMovie.portuguese_title}`,
    });
  }
}
async function loadMovie(): Promise<void> {
  if (!routeIDPath.value) {
    return;
  }
  try {
    const res = await MovieService.getMovie(routeIDPath.value);
    moviePage.value.selectedMovie = res;
    setDocumentTitle();
  } catch {
    showError('Erro ao buscar filme. Tente novamente mais tarde.');
    router.push('/home');
  }
}
function showNotifyMovie(movieTitle?: string, movieId?: string) {
  if (!movieTitle || !movieId) {
    return;
  }
  $q.notify({
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
          router.push(`/movie/${movieId}`);
        },
      },
    ],
  });
}
async function cancel() {
  if (routeName.value === 'add') {
    resetForm();
    return;
  }

  moviePage.value.isEditing = false;
  await loadMovie();
}
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
