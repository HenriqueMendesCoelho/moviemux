<template>
  <BaseContainerMain>
    <p v-if="loading" role="status">Carregando filme…</p>
    <div v-else-if="error" role="alert" class="mm-empty">
      <p>{{ error }}</p>
      <button class="mm-button" @click="loadMovie(true)">Tentar novamente</button>
    </div>
    <p v-else-if="ready && !canEdit" role="alert">
      Somente o autor ou um administrador pode editar este filme.
    </p>
    <template v-else-if="ready">
      <MovieSuperiorButtons
        show-delete-btn
        show-refresh-btn
        confirm-refresh
        :disabled="saving"
        @refresh="loadMovie(true)"
      />
      <MovieForm ref="formMovieRef" />
      <MovieVideoEmbedded width="100%" />
      <MovieSaveBtnGroup
        @save="save"
        @cancel="showConfirmDialogCancel"
        :disable-save="saving || !hasMovieFields(draft)"
        :disable-cancel="saving"
      />
      <p v-if="saving" role="status">Salvando alterações…</p>
      <BaseConfirmDialog ref="confirmDialogRef" @ok="cancel" />
    </template>
  </BaseContainerMain>
</template>
<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useHead } from '#imports';
import BaseContainerMain from 'src/core/components/BaseContainerMain.vue';
import BaseConfirmDialog from 'src/core/components/BaseConfirmDialog.vue';
import MovieSuperiorButtons from '../components/MovieSuperiorButtons.vue';
import MovieSaveBtnGroup from '../components/MovieSaveBtnGroup.vue';
import MovieForm from '../components/MovieForm.vue';
import MovieVideoEmbedded from '../components/MovieVideoEmbedded.vue';
import Movie from 'src/core/domain/movie/movie';
import { useMovieStore } from '../stores/MovieStore';
import { useUserStore } from 'src/core/stores/UserStore';
import { provideMovieContext } from '../composables/useMovieContext';
import { useMovieRequests } from '../composables/useMovieRequests';
import { cloneMovie, hasMovieFields } from '../utils/MovieStateUtils';
import MovieService from '../services/MovieService';
import { showError, showSuccess } from 'src/core/utils/NotificationUtils';
const route = useRoute(),
  router = useRouter(),
  store = useMovieStore(),
  userStore = useUserStore(),
  requests = useMovieRequests();
const id = computed(() => route.params.id?.toString() || '');
const draft = ref<Movie>(new Movie()),
  ready = ref(false),
  loading = ref(true),
  saving = ref(false),
  error = ref('');
provideMovieContext(draft);
const canEdit = computed(
  () => userStore.user.isLoged && (userStore.isAdmin || draft.value.user_id === userStore.user.id),
);
const confirmDialogRef = ref<InstanceType<typeof BaseConfirmDialog>>(),
  formMovieRef = ref<InstanceType<typeof MovieForm>>();
let mounted = false;
useHead(() => ({
  title: `Movie Mux - Editando ${ready.value ? draft.value.portuguese_title || 'filme' : 'filme'}`,
}));
onMounted(() => {
  mounted = true;
  void loadMovie();
});
watch(
  requests.context,
  () => {
    draft.value = new Movie();
    ready.value = false;
    saving.value = false;
    error.value = '';
    if (mounted && route.name === 'movie-edit' && route.path === `/movie/edit/${id.value}`)
      void loadMovie(true);
  },
  { flush: 'sync' },
);
async function loadMovie(force = false) {
  ready.value = false;
  error.value = '';
  if (!id.value || !userStore.user.isLoged) {
    loading.value = false;
    return;
  }
  const current = requests.begin('load'),
    target = id.value;
  loading.value = true;
  try {
    const movie =
      !force && store.moviePage.selectedMovie.id === target
        ? store.moviePage.selectedMovie
        : await MovieService.getMovie(target);
    if (!current()) return;
    draft.value = cloneMovie(movie);
    ready.value = true;
  } catch {
    if (current()) error.value = 'Não foi possível carregar o filme.';
  } finally {
    if (current()) loading.value = false;
  }
}
function showConfirmDialogCancel() {
  confirmDialogRef.value?.show({
    message: 'Descartar as alterações não salvas?',
    title: 'Cancelar edição',
    focus: 'cancel',
    ok: 'Descartar',
  });
}
async function save() {
  if (saving.value || !ready.value || !canEdit.value) return;
  const current = requests.begin('save');
  saving.value = true;
  try {
    if (await formMovieRef.value?.hasErrors()) return;
    if (!current() || !canEdit.value) return;
    const movie = cloneMovie(draft.value),
      target = movie.id;
    if (!target || target !== id.value) return;
    const result = await MovieService.updateMovie({
      ...movie,
      genres: movie.genres?.map((g) => g.id),
    });
    if (!current()) return;
    store.moviePage.selectedMovie = cloneMovie(result);
    showSuccess('Filme salvo com sucesso.');
    await router.push(`/movie/${target}`);
  } catch {
    if (current()) showError('Erro ao salvar filme.');
  } finally {
    if (current()) saving.value = false;
  }
}
async function cancel() {
  if (saving.value) return;
  requests.invalidate();
  draft.value = new Movie();
  ready.value = false;
  await router.push(`/movie/${id.value}`);
}
</script>
