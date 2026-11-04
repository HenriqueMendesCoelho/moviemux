<template>
  <div v-if="tmdbIds.length && isOwner" class="mm-cleanup">
    <p>
      <strong>{{ t('library.ratedCount', tmdbIds.length) }}</strong>
      <span class="mm-cleanup-explanation"> {{ t('library.cleanupHelp') }}</span>
    </p>
    <button
      class="mm-cleanup-action"
      type="button"
      :disabled="disabled || busy"
      @click="confirmCleanup"
    >
      {{ t('library.review')
      }}<span class="mm-cleanup-explanation"> {{ t('library.andRemove') }}</span></button
    ><BaseConfirmDialog :key="confirmationKey" ref="confirmDialogRef" @ok="remove" />
  </div>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
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
    title: () => t('library.reviewRemove'),
    message: () => t('library.removeNames', { names: names.join(', ') }),
    focus: 'cancel',
    ok: () => t('library.remove'),
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
  padding: 11px 14px;
  background: var(--mm-raised);
  border: 1px solid var(--mm-border);
  border-radius: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin: 0 0 16px;
}
.mm-cleanup p {
  margin: 0;
  font-size: 0.78rem;
  color: var(--mm-muted);
}
.mm-cleanup strong {
  font-weight: 500;
  color: var(--mm-text);
}
.mm-cleanup-action {
  min-height: 32px;
  padding: 4px 6px;
  font-size: 0.78rem;
  text-decoration: underline;
  text-underline-offset: 3px;
  color: var(--mm-muted);
}
.mm-cleanup-action:hover {
  color: var(--mm-text);
}
@media (max-width: 600px) {
  .mm-cleanup {
    flex-wrap: nowrap;
    padding: 6px 10px;
    gap: 8px;
    margin-bottom: 12px;
  }
  .mm-cleanup-explanation {
    display: none;
  }
  .mm-cleanup p {
    font-size: 0.74rem;
  }
  .mm-cleanup-action {
    white-space: nowrap;
    font-size: 0.74rem;
    min-height: 32px;
  }
}
</style>
