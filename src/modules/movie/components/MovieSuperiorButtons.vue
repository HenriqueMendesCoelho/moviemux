<template>
  <div class="row" :class="isDesktop ? 'q-col-gutter-md' : 'q-col-gutter-sm'">
    <div class="col-auto">
      <q-btn color="grey-mid2" text-color="white" round icon="refresh" @click="loadMovie()" />
    </div>
    <div class="col-auto" v-if="props.showEditBtn">
      <q-btn color="primary" text-color="white" label="Editar" icon="edit" @click="goToEditPage" />
    </div>
    <div class="col-auto" v-if="userStore.isAdmin && showDeleteBtn">
      <q-btn color="red" text-color="white" label="Deletar" icon="delete" @click="deleteMovie" />
    </div>

    <div class="col-auto">
      <div class="row justify-end">
        <div class="col-auto">
          <q-btn
            v-if="props.showImportBtn"
            @click="moviePage.showImportMovieDialog = !moviePage.showImportMovieDialog"
            color="primary"
            text-color="white"
            label="Importar do TMDB"
            :disable="movieStore.selectedMovieHasAnyFieldFilled()"
            icon="download"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, toRaw, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';

import { useMovieStore } from '../stores/MovieStore';
import { useUserStore } from 'src/core/stores/UserStore';

import { stateSocketMovie } from 'src/boot/socket';

import MovieService from '../services/MovieService';
import { showError, showSuccess, showWarning } from 'src/core/utils/NotificationUtils';

const props = withDefaults(
  defineProps<{
    showImportBtn?: boolean;
    showEditBtn?: boolean;
    showRefreshBtn?: boolean;
    showDeleteBtn?: boolean;
  }>(),
  {
    showImportBtn: false,
    showEditBtn: false,
    showRefreshBtn: false,
    showDeleteBtn: false,
  },
);

const $q = useQuasar();
const isDesktop = $q.platform.is.desktop;
const movieStore = useMovieStore();
const userStore = useUserStore();
const route = useRoute();
const router = useRouter();

const moviePage = computed(() => movieStore.moviePage);
const user = computed(() => userStore.user);
const routeIDPath = computed(() => route.params.id);

watch(
  () => stateSocketMovie.updateMovie,
  async (val) => {
    const lastEvent = toRaw(val)[val.length - 1];
    const movieSelected = moviePage.value.selectedMovie;
    if (lastEvent?.movie !== movieSelected.id) {
      return;
    }
    await loadMovie(false);
  },
  { deep: true },
);

watch(
  () => stateSocketMovie.deletedMovie,
  async (val) => {
    const lastEvent = toRaw(val)[val.length - 1];
    if (user.value.id === lastEvent?.emmitedByUserId) {
      return;
    }

    await router.push('/home');
    showWarning('Oops! Parece que o filme que você estava vendo foi deletado.', 10000);
  },
  { deep: true },
);
async function loadMovie(showDialog = true) {
  if (routeIDPath.value) {
    try {
      const res = await MovieService.getMovie(routeIDPath.value.toString());
      moviePage.value.selectedMovie = res;
      if (showDialog) showSuccess('Pagina atualizada com sucesso');
    } catch {
      showError('Erro ao buscar filme');
    }
  }
}
async function deleteMovie() {
  if (!moviePage.value.selectedMovie.id) {
    return;
  }
  try {
    await MovieService.deleteMovie(moviePage.value.selectedMovie.id);
    showSuccess('Filme deletado');
    await router.push('/home');
  } catch {
    showError('Erro ao deletar filme');
  }
}
async function goToEditPage() {
  await router.push({ name: 'movie-edit', params: { id: moviePage.value.selectedMovie.id } });
}
</script>
