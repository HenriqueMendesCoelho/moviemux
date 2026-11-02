<template>
  <BaseContainerMain>
    <MovieSuperiorButtons show-import-btn :disabled="saving" @import="showImport = true" />
    <MovieForm ref="formMovieRef" /><MovieVideoEmbedded width="100%" />
    <MovieSaveBtnGroup
      @save="save"
      @cancel="showConfirmDialogCancel"
      :disable-cancel="saving || !hasMovieFields(draft)"
      :disable-save="saving"
    />
    <p v-if="saving" role="status">Salvando filme…</p>
    <BaseConfirmDialog ref="confirmDialogRef" @ok="resetForm" /><MovieDialogImportFromTmdb
      v-model="showImport"
    />
  </BaseContainerMain>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import BaseContainerMain from 'src/core/components/BaseContainerMain.vue';
import BaseConfirmDialog from 'src/core/components/BaseConfirmDialog.vue';
import MovieSuperiorButtons from '../components/MovieSuperiorButtons.vue';
import MovieForm from '../components/MovieForm.vue';
import MovieVideoEmbedded from '../components/MovieVideoEmbedded.vue';
import MovieDialogImportFromTmdb from '../components/MovieDialogImportFromTmdb.vue';
import MovieSaveBtnGroup from '../components/MovieSaveBtnGroup.vue';
import Movie from 'src/core/domain/movie/movie';
import { useStyleStore } from 'src/core/stores/StyleStore';
import { useUserStore } from 'src/core/stores/UserStore';
import { provideMovieContext } from '../composables/useMovieContext';
import { useMovieRequests } from '../composables/useMovieRequests';
import { cloneMovie, hasMovieFields } from '../utils/MovieStateUtils';
import MovieService from '../services/MovieService';
import { notifyRouteToMovie } from '../utils/MovieNotificationUtils';
import { showError, showSuccess } from 'src/core/utils/NotificationUtils';
const router = useRouter(),
  userStore = useUserStore(),
  requests = useMovieRequests(),
  style = useStyleStore();
const draft = ref<Movie>(new Movie()),
  saving = ref(false),
  showImport = ref(false);
provideMovieContext(draft);
const confirmDialogRef = ref<InstanceType<typeof BaseConfirmDialog>>(),
  formMovieRef = ref<InstanceType<typeof MovieForm>>();
watch(
  requests.context,
  () => {
    draft.value = new Movie();
    saving.value = false;
    showImport.value = false;
  },
  { flush: 'sync' },
);
async function save() {
  if (saving.value || !userStore.user.isLoged) return;
  const current = requests.begin('save');
  saving.value = true;
  try {
    if (await formMovieRef.value?.hasErrors()) return;
    if (!current()) return;
    const movie = cloneMovie(draft.value);
    const result = await MovieService.createMovie({
      ...movie,
      genres: movie.genres?.map((g) => g.id),
    });
    if (!current()) return;
    draft.value = new Movie();
    formMovieRef.value?.resetValidation();
    style.scrollToContainer(0, 0, 'smooth');
    const account = userStore.user.id;
    notifyRouteToMovie({
      movieTitle:
        result.portuguese_title || result.english_title || result.original_title || 'Filme',
      handler: () => {
        if (userStore.user.isLoged && userStore.user.id === account)
          void router.push(`/movie/${result.id}`);
      },
    });
    showSuccess('Filme salvo com sucesso.');
  } catch {
    if (current()) showError('Erro ao salvar filme.');
  } finally {
    if (current()) saving.value = false;
  }
}
function resetForm() {
  if (saving.value) return;
  requests.invalidate();
  draft.value = new Movie();
  formMovieRef.value?.resetValidation();
}
function showConfirmDialogCancel() {
  confirmDialogRef.value?.show({
    message: 'Descartar todos os dados preenchidos?',
    focus: 'cancel',
    title: 'Limpar formulário',
    ok: 'Descartar',
  });
}
</script>
