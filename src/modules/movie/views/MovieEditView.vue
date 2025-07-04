<template>
  <BaseContainerMain>
    <div>
      <MovieSuperiorButtons showDeleteBtn />
      <BaseHorizontalSeparator />
    </div>
    <div class="text-white">
      <MovieForm ref="formMovieRef" />
      <MovieVideoEmbedded :width="isMobile ? '100%' : '560px'" />
      <MovieSaveBtnGroup
        @save="save()"
        @cancel="showConfirmDialogCancel()"
        :disable-save="!movieStore.selectedMovieHasAnyFieldFilled()"
      />
    </div>
    <BaseConfirmDialog ref="confirmDialogRef" @ok="cancel()" />
  </BaseContainerMain>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeMount, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMeta, useQuasar } from 'quasar';

import BaseContainerMain from 'src/core/components/BaseContainerMain.vue';
import BaseHorizontalSeparator from 'src/core/components/BaseHorizontalSeparator.vue';
import BaseConfirmDialog from 'src/core/components/BaseConfirmDialog.vue';

import MovieSuperiorButtons from '../components/MovieSuperiorButtons.vue';
import MovieSaveBtnGroup from '../components/MovieSaveBtnGroup.vue';
import MovieForm from '../components/MovieForm.vue';
import MovieVideoEmbedded from '../components/MovieVideoEmbedded.vue';

import { useMovieStore } from '../stores/MovieStore';
import MovieService from '../services/MovieService';
import { hideLoading, showLoading } from 'src/core/utils/LoadingUtils';
import { showError, showSuccess } from 'src/core/utils/NotificationUtils';

const $q = useQuasar();
const isMobile = $q.platform.is.mobile;
const route = useRoute();
const router = useRouter();

const idPathParam = ref(route.params.id?.toString());

const movieStore = useMovieStore();
const moviePage = computed(() => movieStore.moviePage);

const confirmDialogRef = ref<InstanceType<typeof BaseConfirmDialog>>();
const formMovieRef = ref<InstanceType<typeof MovieForm>>();

onBeforeMount(async () => {
  if (moviePage.value.selectedMovie.id === idPathParam.value) {
    setDocumentTitle();
    return;
  }

  await loadMovie();
});
onUnmounted(() => resetForm());

async function loadMovie(): Promise<void> {
  if (!idPathParam.value) {
    return;
  }
  try {
    const res = await MovieService.getMovie(idPathParam.value);
    moviePage.value.selectedMovie = res;
    setDocumentTitle();
  } catch {
    showError('Erro ao buscar filme. Tente novamente mais tarde.');
    await router.push('/home');
  }
}
function showConfirmDialogCancel() {
  confirmDialogRef.value?.show({
    message: 'Caso cancele todos os dados alterados serão perdidos. Você quer cancelar? ',
    focus: 'cancel',
    title: 'Confirme o cancelamento',
    ok: 'Sim',
  });
}
function resetForm() {
  movieStore.$reset();
  formMovieRef.value?.resetValidation();
}
async function save(): Promise<void> {
  if (await formMovieRef.value?.hasErrors()) {
    return;
  }
  const movie = { ...moviePage.value.selectedMovie };
  const request = {
    ...movie,
    genres: movie.genres?.map((g: { id: number }) => g.id),
  };
  if (!request) {
    return;
  }

  try {
    showLoading();
    const res = await MovieService.updateMovie(request);
    moviePage.value.selectedMovie = res;
    showSuccess('Filme foi salvo com sucesso');
    await router.push(`/movie/${movie.id}`);
  } catch {
    showError('Erro ao salvar filme');
  } finally {
    hideLoading();
  }
}
function setDocumentTitle() {
  useMeta({
    title: `Movie Mux - Editando ${moviePage.value.selectedMovie.portuguese_title}`,
  });
}
async function cancel() {
  await router.push(`/movie/${idPathParam.value}`);
}
</script>
