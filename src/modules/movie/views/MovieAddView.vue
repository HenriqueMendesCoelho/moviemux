<template>
  <BaseContainerMain>
    <div>
      <MovieSuperiorButtons show-import-btn />
      <BaseHorizontalSeparator />
    </div>
    <div class="text-white">
      <MovieForm ref="formMovieRef" />
      <MovieVideoEmbedded :width="isMobile ? '100%' : '560px'" />
      <MovieSaveBtnGroup
        @save="save()"
        @cancel="showConfirmDialogCancel()"
        :disable-cancel="!movieStore.selectedMovieHasAnyFieldFilled()"
      />
    </div>
    <BaseConfirmDialog ref="confirmDialogRef" @ok="resetForm()" />
    <MovieDialogImportFromTmdb />
  </BaseContainerMain>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';

import BaseContainerMain from 'src/core/components/BaseContainerMain.vue';
import BaseHorizontalSeparator from 'src/core/components/BaseHorizontalSeparator.vue';
import BaseConfirmDialog from 'src/core/components/BaseConfirmDialog.vue';

import MovieSuperiorButtons from '../components/MovieSuperiorButtons.vue';
import MovieForm from '../components/MovieForm.vue';
import MovieVideoEmbedded from '../components/MovieVideoEmbedded.vue';
import MovieDialogImportFromTmdb from '../components/MovieDialogImportFromTmdb.vue';
import MovieSaveBtnGroup from '../components/MovieSaveBtnGroup.vue';

import { useMovieStore } from '../stores/MovieStore';
import { useStyleStore } from 'src/core/stores/StyleStore';
import { hideLoading, showLoading } from 'src/core/utils/LoadingUtils';

import MovieService from '../services/MovieService';
import { notifyRouteToMovie } from '../utils/MovieNotificationUtils';
import { showError, showSuccess } from 'src/core/utils/NotificationUtils';

const $q = useQuasar();
const isMobile = $q.platform.is.mobile;
const router = useRouter();

const scrollToTop = () => useStyleStore().scrollToContainer(0, 0, 'smooth');

const movieStore = useMovieStore();
const moviePage = computed(() => movieStore.moviePage);

const confirmDialogRef = ref<InstanceType<typeof BaseConfirmDialog>>();
const formMovieRef = ref<InstanceType<typeof MovieForm>>();

onMounted(() => resetForm());

async function save() {
  if (await formMovieRef.value?.hasErrors()) {
    console.error('Erro ao salvar filme');
    return;
  }
  const movie = { ...moviePage.value.selectedMovie };
  const request = { ...moviePage.value.selectedMovie, genres: movie.genres?.map((g: { id: number }) => g.id) };
  if (!request) {
    return;
  }

  try {
    showLoading();
    const movie = await MovieService.createMovie(request);
    resetForm();
    scrollToTop();

    const movieTitle = movie.portuguese_title || movie.english_title || movie.original_title;
    notifyRouteToMovie({
      movieTitle: movieTitle!,
      handler: () => {
        router.push(`/movie/${movie.id}`);
      },
    });
    showSuccess('Filme foi salvo com sucesso');
  } catch {
    showError('Erro ao salvar filme');
  } finally {
    hideLoading();
  }
}
function resetForm() {
  movieStore.$reset();
  formMovieRef.value?.resetValidation();
}
function showConfirmDialogCancel() {
  confirmDialogRef.value?.show({
    message: 'Caso cancele todos os dados serão limpos. Você quer cancelar? ',
    focus: 'cancel',
    title: 'Confirme o cancelamento',
    ok: 'Sim',
  });
}
</script>
