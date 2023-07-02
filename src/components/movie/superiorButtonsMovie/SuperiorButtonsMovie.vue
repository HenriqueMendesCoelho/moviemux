<template>
  <div class="row q-col-gutter-sm">
    <div class="col-md-auto col-sm-12 q-ml-md" v-if="showTopButtons()">
      <q-btn color="grey-mid2" text-color="white" round icon="refresh" @click="loadMovie()" />
    </div>
    <div class="col-md-auto col-sm-12 q-ml-md" v-if="showEditAndDeleteButton() && showTopButtons()">
      <q-btn
        style="width: 100%"
        color="primary"
        text-color="white"
        label="Editar"
        icon="edit"
        @click="moviePage.isEditing = !moviePage.isEditing"
      />
    </div>
    <div class="col-md-auto col-sm-12 q-ml-md" v-if="showEditAndDeleteButton() && showTopButtons()">
      <q-btn style="width: 100%" color="red" text-color="white" label="Deletar" icon="delete" @click="deleteMovie" />
    </div>

    <div class="col-md-grow col-sm-12">
      <div class="row justify-end">
        <div class="col-auto">
          <q-btn
            @click="moviePage.showImportMovieDialog = !moviePage.showImportMovieDialog"
            style="width: 100%"
            color="primary"
            text-color="white"
            label="Importar do TMDB"
            v-if="showBtnImport()"
            :disable="movieStore.selectedMovieHasAnyFieldFilled()"
            icon="download"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';

import { useMovieStore } from 'src/stores/MovieStore';
import { useUserStore } from 'src/stores/UserStore';

import MovieService from 'src/services/MovieService';

const $q = useQuasar();
const movieStore = useMovieStore();
const userStore = useUserStore();
const route = useRoute();
const router = useRouter();

const moviePage = computed(() => movieStore.moviePage);
const user = computed(() => userStore.user);
const routeName = computed(() => route.name);
const routeIDPath = computed(() => route.params.id);

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

function showBtnImport() {
  if (routeName.value === 'add') {
    return true;
  }

  return moviePage.value.isEditing;
}
function showTopButtons() {
  return routeName.value === 'movie';
}
function showEditAndDeleteButton() {
  if (moviePage.value.isEditing) {
    return false;
  }

  if (user.value.id === moviePage.value.selectedMovie.user_id || user.value.roles.includes('ADM')) {
    return true;
  }
}
async function loadMovie() {
  if (routeIDPath.value) {
    try {
      const res = await MovieService.getMovie(routeIDPath.value.toString());
      moviePage.value.selectedMovie = res;
      showSuccess('Pagina atualizada com sucesso');
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
    router.push('/home');
  } catch {
    showError('Erro ao deletar filme');
  }
}
</script>
