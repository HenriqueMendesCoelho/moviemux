<template>
  <div>
    <div>
      <q-btn @click="showNotifyMovie(false)" icon="playlist_remove" size="lg" flat round />
      <CustomTooltip>Remover filmes já cadastrados no ranking do cineminha da lista</CustomTooltip>
    </div>
    <ConfirmDialog ref="confirmDialogRef" @ok="deteleMoviesFromWishlist" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useQuasar } from 'quasar';

import type { WishlistType } from 'src/types/wishlist/WishlistType';
import type { ConfirmDialogRefType } from 'src/components/shared/confirmDialog/types/ConfirmDialogType';

import ConfirmDialog from 'src/components/shared/confirmDialog/ConfirmDialog.vue';
import CustomTooltip from 'src/components/shared/customTooltip/CustomTooltip.vue';

import { useUserStore } from 'src/stores/UserStore';
import WishlistService from 'src/services/WishlistService';

interface Props {
  wishlist?: WishlistType;
}
const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:wishlist', value: WishlistType): void;
}>();

const $q = useQuasar();
const userStore = useUserStore();
const user = userStore.user;
const isOwner = computed(() => user.id === props.wishlist?.user.id);
const tmdbIds = ref<number[]>([]);

const confirmDialogRef = ref<ConfirmDialogRefType>();

onMounted(() => {
  if (props.wishlist?.id) {
    showNotifyMovie();
  }
});

watch(
  () => props.wishlist,
  () => {
    if (props.wishlist?.id) {
      showNotifyMovie();
    }
  }
);

function showLoading() {
  $q.loading.show({
    spinnerColor: 'kb-primary',
  });
}
function hideLoading() {
  $q.loading.hide();
}
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

async function searchMoviesRated() {
  if (!props.wishlist?.id) {
    return;
  }

  try {
    const res: { movie_tmdb_ids: number[] } = await WishlistService.searchWishlistMoviesRated(props.wishlist.id);
    tmdbIds.value = [...res?.movie_tmdb_ids];

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
    message: 'Existem filmes nessa lista que já estão cadastrados no ranking do cineminha! Deseja removê-los?',
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
  confirmDialogRef.value?.dialog(
    `Tem certeza que deseja remover os filmes '${names.join(', ')}' dessa lista? Caso remova não há como desfazer a ação.`,
    'cancel',
    'Quer mesmo remover?',
    'Sim'
  );
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
  return wishlist?.movies_wishlists?.length ? wishlist.movies_wishlists.filter((m) => tmdbIds.value.includes(m.tmdb_id)) : [];
}
async function deteleMoviesFromWishlist() {
  if (!props.wishlist) {
    return;
  }

  const wishlist = { ...props.wishlist };
  wishlist.movies_wishlists = wishlist.movies_wishlists.filter((m) => !tmdbIds.value.includes(m.tmdb_id));
  const res = await updateWishlist(wishlist);
  if (!res) {
    return;
  }
  showSuccess('Filmes removidos da lista');
  emit('update:wishlist', res);
}
async function updateWishlist(wishlist: WishlistType) {
  try {
    showLoading();
    return await WishlistService.updateWishlist(wishlist);
  } catch (error) {
    showError('Erro ao salvar lista de filmes');
  } finally {
    hideLoading();
  }
}
</script>
