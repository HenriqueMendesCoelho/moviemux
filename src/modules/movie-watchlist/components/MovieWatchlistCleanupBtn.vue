<template>
  <div v-if="tmdbIds.length && isOwner" class="mm-cleanup">
    <p>{{ tmdbIds.length }} filme(s) desta lista já estão no ranking.</p>
    <button class="mm-button" type="button" :disabled="disabled || busy" @click="confirmCleanup">
      Remover filmes já cadastrados</button
    ><BaseConfirmDialog :key="confirmationKey" ref="confirmDialogRef" @ok="remove" />
  </div>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useUserStore } from 'src/core/stores/UserStore';
import type { WatchlistType } from 'src/core/types/movie-watchlist/WatchlistType';
import BaseConfirmDialog from 'src/core/components/BaseConfirmDialog.vue';
import MovieWatchlistService from '../services/MovieWatchlistService';
const props = defineProps<{
  wishlist?: WatchlistType;
  disabled?: boolean;
  removeRated: (ids: number[]) => Promise<boolean>;
}>();
const userStore = useUserStore();
const isOwner = computed(
  () => userStore.user.isLoged && userStore.user.id === props.wishlist?.user.id,
);
const tmdbIds = ref<number[]>([]);
const busy = ref(false);
const confirmDialogRef = ref<InstanceType<typeof BaseConfirmDialog>>();
const confirmationKey = computed(() => `${props.wishlist?.id}:${userStore.user.id}`);
let generation = 0;
let disposed = false;
let confirmed: { id: string; account: string; ids: number[] } | undefined;
watch(() => props.wishlist, loadRated, { immediate: true });
watch(
  () => userStore.user.id,
  () => {
    confirmed = undefined;
    void loadRated();
  },
);
onBeforeUnmount(() => {
  disposed = true;
  generation++;
});
async function loadRated() {
  const version = ++generation;
  const id = props.wishlist?.id;
  const account = userStore.user.id;
  tmdbIds.value = [];
  if (!id || !isOwner.value) return;
  try {
    const result = await MovieWatchlistService.searchWatchlistMoviesRated(id);
    if (
      !disposed &&
      version === generation &&
      account === userStore.user.id &&
      id === props.wishlist?.id
    )
      tmdbIds.value = result.movie_tmdb_ids.filter((value) =>
        props.wishlist?.movies_wishlists.some((movie) => movie.tmdb_id === value),
      );
  } catch {
    /* Cleanup is optional; keep other list actions available. */
  }
}
function confirmCleanup() {
  if (!props.wishlist || !isOwner.value || props.disabled || busy.value) return;
  const ids = [...tmdbIds.value];
  const names = props.wishlist.movies_wishlists
    .filter((movie) => ids.includes(movie.tmdb_id))
    .map((movie) => movie.title || movie.title_english);
  confirmed = { id: props.wishlist.id, account: userStore.user.id, ids };
  confirmDialogRef.value?.show({
    title: 'Remover filmes já cadastrados?',
    message: `Remover ${names.join(', ')} desta lista?`,
    focus: 'cancel',
    ok: 'Remover',
  });
}
async function remove() {
  const target = confirmed;
  confirmed = undefined;
  if (
    !target ||
    !isOwner.value ||
    props.disabled ||
    busy.value ||
    target.id !== props.wishlist?.id ||
    target.account !== userStore.user.id
  )
    return;
  busy.value = true;
  try {
    await props.removeRated(target.ids);
  } finally {
    if (!disposed) busy.value = false;
  }
}
</script>
<style scoped>
.mm-cleanup {
  padding: 14px 18px;
  background: var(--grey-dark2);
  border: 1px solid var(--grey-mid2);
  border-radius: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.mm-cleanup p {
  margin: 0;
  font-size: 0.9rem;
}
</style>
