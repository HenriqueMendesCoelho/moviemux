<template>
  <nav class="mm-movie-actions" aria-label="Ações do filme">
    <router-link class="mm-button" to="/home">← Coleção</router-link>
    <button
      v-if="showRefreshBtn"
      type="button"
      aria-label="Atualizar filme"
      title="Atualizar filme"
      class="mm-button mm-button-ghost"
      :disabled="disabled || refreshing || deleting"
      @click="requestRefresh"
    >
      <BaseIcon name="refresh" />
    </button>
    <button
      v-if="showEditBtn && canEdit"
      type="button"
      class="mm-button"
      :disabled="disabled || deleting"
      @click="goToEditPage"
    >
      Editar filme
    </button>
    <button
      v-if="userStore.isAdmin && showDeleteBtn"
      type="button"
      class="mm-button mm-danger"
      :disabled="disabled || deleting"
      @click="confirmDelete"
    >
      Excluir filme
    </button>
    <button
      v-if="showImportBtn"
      type="button"
      class="mm-button"
      :disabled="disabled"
      @click="emit('import')"
    >
      <BaseIcon name="download" /> Importar do TMDB
    </button>
  </nav>
  <BaseConfirmDialog ref="deleteDialog" @ok="deleteMovie" /><BaseConfirmDialog
    ref="refreshDialog"
    @ok="refreshConfirmed"
  />
</template>
<script setup lang="ts">
import { computed, watch, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import BaseIcon from 'src/core/components/BaseIcon.vue';
import BaseConfirmDialog from 'src/core/components/BaseConfirmDialog.vue';
import { useUserStore } from 'src/core/stores/UserStore';
import { useMovieContext } from '../composables/useMovieContext';
import { useMovieRequests } from '../composables/useMovieRequests';
import { stateSocketMovie } from 'src/boot/socket';
import MovieService from '../services/MovieService';
import { showError, showSuccess, showWarning } from 'src/core/utils/NotificationUtils';
const props = defineProps<{
  showImportBtn?: boolean;
  showEditBtn?: boolean;
  showRefreshBtn?: boolean;
  showDeleteBtn?: boolean;
  confirmRefresh?: boolean;
  disabled?: boolean;
}>();
const emit = defineEmits<{ import: []; refresh: [] }>();
const movie = useMovieContext(),
  userStore = useUserStore(),
  route = useRoute(),
  router = useRouter(),
  requests = useMovieRequests();
const canEdit = computed(
  () => userStore.user.isLoged && (userStore.isAdmin || movie.value.user_id === userStore.user.id),
);
const deleteDialog = ref<InstanceType<typeof BaseConfirmDialog>>(),
  refreshDialog = ref<InstanceType<typeof BaseConfirmDialog>>();
const deleting = ref(false),
  refreshing = ref(false);
let deletionTarget = '',
  deletionCurrent = () => false,
  refreshCurrent = () => false;
watch(
  requests.context,
  () => {
    deletionTarget = '';
    deleting.value = false;
    refreshing.value = false;
  },
  { flush: 'sync' },
);
watch(
  () => stateSocketMovie.updateMovie,
  (events) => {
    const last = events.at(-1);
    if (!userStore.user.isLoged || last?.movie !== movie.value.id) return;
    if (props.confirmRefresh) {
      showWarning(
        'Este filme foi atualizado. Use Atualizar para carregar os novos dados e descartar sua edição.',
      );
      return;
    }
    void loadMovie(false);
  },
  { deep: true },
);
watch(
  () => stateSocketMovie.deletedMovie,
  (events) => {
    const last = events.at(-1);
    if (
      !last ||
      !userStore.user.isLoged ||
      last.movie !== movie.value.id ||
      last.emmitedByUserId === userStore.user.id
    )
      return;
    void router.push('/home');
    showWarning('O filme que você estava vendo foi excluído.', 10000);
  },
  { deep: true },
);
function requestRefresh() {
  if (props.disabled || refreshing.value) return;
  refreshCurrent = requests.begin('refresh-confirm');
  if (props.confirmRefresh)
    refreshDialog.value?.show({
      title: 'Recarregar filme',
      message: 'Descartar as alterações não salvas e carregar os dados atuais?',
      focus: 'cancel',
      ok: 'Recarregar',
    });
  else void loadMovie();
}
function refreshConfirmed() {
  if (refreshCurrent() && !props.disabled && canEdit.value) emit('refresh');
}
async function loadMovie(notify = true) {
  const target = movie.value.id;
  if (!target || target !== route.params.id || !userStore.user.isLoged) return;
  const current = requests.begin('refresh');
  refreshing.value = true;
  try {
    const result = await MovieService.getMovie(target);
    if (!current()) return;
    movie.value = result;
    if (notify) showSuccess('Filme atualizado.');
  } catch {
    if (current()) showError('Não foi possível atualizar o filme.');
  } finally {
    if (current()) refreshing.value = false;
  }
}
function confirmDelete() {
  if (props.disabled || !userStore.isAdmin || !userStore.user.isLoged || !movie.value.id) return;
  deletionTarget = movie.value.id;
  deletionCurrent = requests.begin('delete-confirm');
  deleteDialog.value?.show({
    title: 'Excluir filme',
    message: `Excluir “${movie.value.portuguese_title || movie.value.original_title}” e suas avaliações?`,
    focus: 'cancel',
    ok: 'Excluir',
  });
}
async function deleteMovie() {
  if (
    deleting.value ||
    props.disabled ||
    !deletionCurrent() ||
    !userStore.isAdmin ||
    !userStore.user.isLoged ||
    deletionTarget !== movie.value.id
  )
    return;
  const target = deletionTarget,
    current = requests.begin('delete');
  deleting.value = true;
  try {
    await MovieService.deleteMovie(target);
    if (!current()) return;
    showSuccess('Filme excluído.');
    await router.push('/home');
  } catch {
    if (current()) showError('Não foi possível excluir o filme.');
  } finally {
    if (current()) deleting.value = false;
  }
}
async function goToEditPage() {
  if (canEdit.value) await router.push({ name: 'movie-edit', params: { id: movie.value.id } });
}
</script>
<style scoped>
.mm-movie-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 2rem;
}
.mm-danger {
  color: var(--mm-danger, #b91c45);
}
</style>
