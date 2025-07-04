<template>
  <BaseContainerMain>
    <div class="row full-width justify-center">
      <BasePageTitle title="Minhas Listas de Filmes" icon="list" />
      <BaseHorizontalSeparator class="q-mb-xl" />
      <div class="col-md-12 col-lg-10 col-xl-9 row q-col-gutter-md q-py-md">
        <div class="text-title-responsive-2 text-white">
          Minhas Listas ({{ watchlists?.length ?? 0 }}/10)
        </div>
        <MovieWatchlistBtnCreate @ok="watchlistStore.getWatchlists()" />
        <div class="col-12 row q-col-gutter-md" v-if="watchlists?.length">
          <router-link
            class="col-xs-12 col-sm-6 col-md-4 col-lg-3 text-white row text-decoration-none"
            :to="{ name: 'movie-watchlist-id', params: { id: list?.id } }"
            v-for="list in watchlists"
            :key="list.name"
          >
            <MovieWatchlistCard
              class="col"
              :wishlist="list"
              @copy-url="copyWatchlistUrl(list.id)"
              @delete="openDialogConfirm(list)"
            />
          </router-link>
        </div>
        <div class="col-12 row justify-center" v-else>
          <div class="text-h4 text-white q-mt-md">Você ainda não tem nenhuma lista criada...</div>
        </div>
        <BaseConfirmDialog
          ref="confirmDialogRef"
          @ok="deleteWatchlist()"
          @cancel="watchlistIdToDelete = ''"
        />
      </div>
    </div>
  </BaseContainerMain>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { copyToClipboard } from 'quasar';

import BaseContainerMain from 'src/core/components/BaseContainerMain.vue';
import BasePageTitle from 'src/core/components/BasePageTitle.vue';
import BaseHorizontalSeparator from 'src/core/components/BaseHorizontalSeparator.vue';
import BaseConfirmDialog from 'src/core/components/BaseConfirmDialog.vue';
import MovieWatchlistBtnCreate from '../components/MovieWatchlistBtnCreate.vue';
import MovieWatchlistCard from '../components/MovieWatchlistCard.vue';

import { showSuccess, showError } from 'src/core/utils/NotificationUtils';
import MovieWatchlistService from '../services/MovieWatchlistService';
import { useMovieWatchlistStore } from '../stores/MovieWatchlistStore';
import type { WatchlistType } from 'src/core/types/movie-watchlist/WatchlistType';
import { hideLoading, showLoading } from 'src/core/utils/LoadingUtils';

const watchlistStore = useMovieWatchlistStore();
const watchlists = computed(() => watchlistStore.watchlists);

const watchlistIdToDelete = ref<string>('');
const confirmDialogRef = ref<InstanceType<typeof BaseConfirmDialog>>();

onMounted(async () => {
  await watchlistStore.getWatchlists();
});

async function copyWatchlistUrl(id?: string) {
  if (!id) {
    return;
  }

  const url = `${window.location.origin}/movie/watchlist/${id}`;
  await copyToClipboard(url);
  showSuccess('Link copiado');
  return url ? url : '';
}
function openDialogConfirm(watchlist: WatchlistType) {
  watchlistIdToDelete.value = watchlist.id;
  confirmDialogRef.value?.show({
    message: `Tem certeza que deseja deletar '${watchlist.name}'? Caso delete não há como desfazer a ação.`,
    focus: 'cancel',
    title: 'Quer mesmo deletar?',
    ok: 'Sim',
  });
}
async function deleteWatchlist() {
  if (!watchlistIdToDelete.value) {
    return;
  }

  try {
    showLoading();
    await MovieWatchlistService.deleteWatchlist(watchlistIdToDelete.value);
    await watchlistStore.getWatchlists();
    showSuccess('Lista deletada com sucesso');
  } catch {
    showError('Erro ao listar suas listas');
  } finally {
    hideLoading();
  }
}
</script>

<style lang="scss" scoped>
.text-decoration-none {
  text-decoration: none;
}
</style>
