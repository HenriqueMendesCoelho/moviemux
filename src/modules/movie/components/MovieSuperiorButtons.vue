<template>
  <nav class="mm-movie-actions" :aria-label="t('catalog.movie.movieActions')">
    <router-link class="mm-button" to="/home">{{ t('catalog.movie.collection') }}</router-link>
    <button
      v-if="showRefreshBtn"
      type="button"
      :aria-label="t('catalog.movie.refreshMovie')"
      :title="t('catalog.movie.refreshMovie')"
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
      {{ t('catalog.movie.editMovie') }}
    </button>
    <button
      v-if="userStore.isAdmin && showDeleteBtn"
      type="button"
      class="mm-button mm-danger"
      :disabled="disabled || deleting"
      @click="confirmDelete"
    >
      {{ t('catalog.movie.deleteMovie') }}
    </button>
    <button
      v-if="showImportBtn"
      type="button"
      class="mm-button"
      :disabled="disabled"
      @click="emit('import')"
    >
      <BaseIcon name="download" /> {{ t('catalog.movie.importTmdb') }}
    </button>
  </nav>
  <BaseConfirmDialog ref="deleteDialog" @ok="deleteMovie" /><BaseConfirmDialog
    ref="refreshDialog"
    @ok="refreshConfirmed"
  />
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
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
      showWarning(() => t('catalog.movie.remoteUpdate'));
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
    showWarning(() => t('catalog.movie.remoteDelete'), 10000);
  },
  { deep: true },
);
function requestRefresh() {
  if (props.disabled || refreshing.value) return;
  refreshCurrent = requests.begin('refresh-confirm');
  if (props.confirmRefresh)
    refreshDialog.value?.show({
      title: () => t('catalog.movie.reloadMovie'),
      message: () => t('catalog.movie.reloadConfirm'),
      focus: 'cancel',
      ok: () => t('catalog.movie.reload'),
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
    if (notify) showSuccess(() => t('catalog.movie.movieUpdated'));
  } catch {
    if (current()) showError(() => t('catalog.movie.refreshError'));
  } finally {
    if (current()) refreshing.value = false;
  }
}
function confirmDelete() {
  if (props.disabled || !userStore.isAdmin || !userStore.user.isLoged || !movie.value.id) return;
  deletionTarget = movie.value.id;
  deletionCurrent = requests.begin('delete-confirm');
  deleteDialog.value?.show({
    title: () => t('catalog.movie.deleteMovie'),
    message: () =>
      t('catalog.movie.deleteConfirm', {
        title:
          movie.value.portuguese_title || movie.value.original_title || t('catalog.movie.movie'),
      }),
    focus: 'cancel',
    ok: () => t('catalog.movie.delete'),
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
    showSuccess(() => t('catalog.movie.movieDeleted'));
    await router.push('/home');
  } catch {
    if (current()) showError(() => t('catalog.movie.deleteError'));
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
