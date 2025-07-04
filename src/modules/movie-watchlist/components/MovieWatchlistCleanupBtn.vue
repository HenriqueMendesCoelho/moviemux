<template>
  <div>
    <div v-if="tmdbIds?.length">
      <q-btn @click="showNotifyMovie(false)" icon="playlist_remove" size="md" round />
      <BaseTooltip>Remover filmes já estão cadastrados no ranking do cineminha</BaseTooltip>
    </div>
    <BaseConfirmDialog ref="confirmDialogRef" @ok="deteleMoviesFromWishlist" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useQuasar } from 'quasar';

import { useUserStore } from 'src/core/stores/UserStore';

import type { WatchlistType } from 'src/core/types/movie-watchlist/WatchlistType';

import BaseConfirmDialog from 'src/core/components/BaseConfirmDialog.vue';
import BaseTooltip from 'src/core/components/BaseTooltip.vue';

import MovieWatchlistService from '../services/MovieWatchlistService';
import { showError, showSuccess } from 'src/core/utils/NotificationUtils';
import { hideLoading, showLoading } from 'src/core/utils/LoadingUtils';

interface Props {
  wishlist?: WatchlistType;
}
const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:wishlist', value: WatchlistType): void;
}>();

const $q = useQuasar();
const userStore = useUserStore();
const user = userStore.user;
const isOwner = computed(() => user.id === props.wishlist?.user.id);
const tmdbIds = ref<number[]>([]);

const confirmDialogRef = ref<InstanceType<typeof BaseConfirmDialog>>();

onMounted(async () => {
  if (props.wishlist?.id) {
    await showNotifyMovie();
  }
});

watch(
  () => props.wishlist,
  async () => {
    if (props.wishlist?.id) {
      await showNotifyMovie();
    }
  },
);

async function searchMoviesRated() {
  if (!props.wishlist?.id) {
    return;
  }

  try {
    const res: { movie_tmdb_ids: number[] } =
      await MovieWatchlistService.searchWatchlistMoviesRated(props.wishlist.id);
    tmdbIds.value = [...res.movie_tmdb_ids];

    return !!tmdbIds.value?.length;
  } catch {
    return false;
  }
}

async function showNotifyMovie(showNotify = true) {
  if (!isOwner.value || !(await searchMoviesRated())) {
    return;
  }
  if (!showNotify) {
    showDialogConfirm();
    return;
  }
  $q.notify({
    type: 'warning',
    message:
      'Existem filmes nessa lista que já estão cadastrados no ranking do cineminha. Deseja removê-los?',
    multiLine: false,
    position: 'top',
    timeout: 15000,
    progress: true,
    icon: 'announcement',
    actions: [
      {
        icon: 'check',
        color: 'black',
        handler: () => showDialogConfirm(),
      },
      {
        icon: 'close',
        color: 'black',
      },
    ],
  });
}
function showDialogConfirm() {
  const names = getMoviesNames();
  confirmDialogRef.value?.show({
    message: `Tem certeza que deseja remover ${names?.length > 1 ? 'os filmes' : 'o filme'} '${names.join(
      ', ',
    )}' dessa lista? Caso remova não há como desfazer a ação.`,
    focus: 'cancel',
    title: 'Quer mesmo remover?',
    ok: 'Sim',
  });
}
function getMoviesNames() {
  if (!props.wishlist?.movies_wishlists?.length) {
    return [];
  }
  const movies = getMoviesRated();
  const names = movies?.map((mw) => mw?.title || mw.title_english);

  return names;
}
function getMoviesRated() {
  if (!props.wishlist) {
    return [];
  }
  const wishlist = { ...props.wishlist };
  return wishlist?.movies_wishlists?.length
    ? wishlist.movies_wishlists.filter((m) => tmdbIds.value.includes(m.tmdb_id))
    : [];
}
async function deteleMoviesFromWishlist() {
  if (!props.wishlist) {
    return;
  }

  const wishlist = { ...props.wishlist };
  wishlist.movies_wishlists = wishlist.movies_wishlists.filter(
    (m) => !tmdbIds.value.includes(m.tmdb_id),
  );
  const res = await updateWishlist(wishlist);
  if (!res) {
    return;
  }
  await searchMoviesRated();
  showSuccess('Filmes removidos da lista');
  emit('update:wishlist', res);
}
async function updateWishlist(wishlist: WatchlistType) {
  try {
    showLoading();
    return await MovieWatchlistService.updateWatchlist(wishlist);
  } catch {
    showError('Erro ao salvar lista de filmes');
  } finally {
    hideLoading();
  }
}
</script>
