<template>
  <BaseContainerMain
    ><header class="mm-section-header">
      <div>
        <span class="mm-eyebrow">Sua próxima sessão começa aqui</span>
        <h1>Minhas listas</h1>
        <p>{{ watchlists.length }}/10 listas criadas</p>
      </div>
      <MovieWatchlistBtnCreate @ok="reload" />
    </header>
    <div class="mm-list-grid" v-if="watchlists.length">
      <MovieWatchlistCard
        v-for="list in watchlists"
        :key="list.id"
        :wishlist="list"
        :disabled="deleting"
        @copy-url="copyWatchlistUrl(list.id)"
        @delete="openDialogConfirm(list)"
      />
    </div>
    <p v-else-if="loading" role="status">Carregando listas…</p>
    <p v-else-if="loadError" role="alert">
      Não foi possível carregar suas listas.
      <button class="mm-button" @click="reload">Tentar novamente</button>
    </p>
    <p v-else class="mm-empty">
      Você ainda não criou uma lista. Reúna os filmes que quer assistir.
    </p>
    <BaseConfirmDialog
      :key="userStore.user.id"
      ref="confirmDialogRef"
      @ok="deleteWatchlist()"
      @cancel="watchlistIdToDelete = ''"
  /></BaseContainerMain>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { useUserStore } from 'src/core/stores/UserStore';
const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

import BaseContainerMain from 'src/core/components/BaseContainerMain.vue';

import BaseConfirmDialog from 'src/core/components/BaseConfirmDialog.vue';
import MovieWatchlistBtnCreate from '../components/MovieWatchlistBtnCreate.vue';
import MovieWatchlistCard from '../components/MovieWatchlistCard.vue';

import { showSuccess, showError } from 'src/core/utils/NotificationUtils';
import MovieWatchlistService from '../services/MovieWatchlistService';
import { useMovieWatchlistStore } from '../stores/MovieWatchlistStore';
import type { WatchlistType } from 'src/core/types/movie-watchlist/WatchlistType';
import { hideLoading, showLoading } from 'src/core/utils/LoadingUtils';

const watchlistStore = useMovieWatchlistStore();
const userStore = useUserStore();
const deleting = ref(false);
const loading = ref(false);
const loadError = ref(false);
let generation = 0;
let disposed = false;
let deleteAccount = '';
onBeforeUnmount(() => {
  disposed = true;
});
watch(
  () => userStore.user.id,
  () => {
    watchlistIdToDelete.value = '';
    deleteAccount = '';
  },
);
const watchlists = computed(() =>
  watchlistStore.watchlists.filter((list) => list.user.id === userStore.user.id),
);

const watchlistIdToDelete = ref<string>('');
const confirmDialogRef = ref<InstanceType<typeof BaseConfirmDialog>>();

onMounted(reload);
watch(
  () => userStore.user.id,
  () => {
    generation++;
    deleting.value = false;
    void reload();
  },
);
async function reload() {
  const version = ++generation;
  loading.value = true;
  loadError.value = false;
  const result = await watchlistStore.getWatchlists();
  if (!disposed && version === generation) {
    loading.value = false;
    loadError.value = !result;
  }
}

async function copyWatchlistUrl(id?: string) {
  if (!id) {
    return;
  }

  const url = `${window.location.origin}/movie/watchlist/${id}`;
  try {
    await copyToClipboard(url);
    showSuccess('Link copiado');
  } catch {
    showError('Não foi possível copiar o link');
  }
  return url ? url : '';
}
function openDialogConfirm(watchlist: WatchlistType) {
  if (deleting.value || !userStore.user.isLoged || watchlist.user.id !== userStore.user.id) return;
  deleteAccount = userStore.user.id;
  watchlistIdToDelete.value = watchlist.id;
  confirmDialogRef.value?.show({
    message: `Tem certeza que deseja deletar '${watchlist.name}'? Caso delete não há como desfazer a ação.`,
    focus: 'cancel',
    title: 'Quer mesmo deletar?',
    ok: 'Sim',
  });
}
async function deleteWatchlist() {
  const id = watchlistIdToDelete.value;
  const account = deleteAccount;
  watchlistIdToDelete.value = '';
  const target = watchlistStore.watchlists.find((list) => list.id === id);
  if (
    deleting.value ||
    !target ||
    !userStore.user.isLoged ||
    target.user.id !== userStore.user.id ||
    account !== userStore.user.id
  )
    return;
  deleting.value = true;
  try {
    showLoading();
    await MovieWatchlistService.deleteWatchlist(id);
    if (disposed || account !== userStore.user.id) return;
    watchlistStore.watchlists = watchlistStore.watchlists.filter((list) => list.id !== id);
    showSuccess('Lista deletada com sucesso');
  } catch {
    if (!disposed && account === userStore.user.id) showError('Erro ao excluir a lista');
  } finally {
    hideLoading();
    if (!disposed) deleting.value = false;
  }
}
</script>

<style scoped>
.mm-list-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 22px;
  margin-top: 28px;
}
.mm-list-grid > a {
  color: inherit;
  text-decoration: none;
}
</style>
