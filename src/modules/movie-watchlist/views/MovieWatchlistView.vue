<template>
  <BaseContainerMain>
    <router-link class="mm-back-link" :to="{ name: 'movie-watchlist-list' }"
      >← Minhas listas</router-link
    >
    <MovieWatchlistPageTitle
      :key="viewKey"
      :watchlist="watchlist"
      :disabled="mutationBlocked"
      :rename="renameWatchlist"
    />
    <form class="mm-filter-bar" @submit.prevent="applySearch">
      <label class="mm-search-field"
        >Buscar nesta lista<input
          v-model="searchText"
          :disabled="allowDrag || loading || saving"
          list="watchlist-titles"
          placeholder="Título em português ou inglês"
          @input="applySearch" /><datalist id="watchlist-titles">
          <option
            v-for="movie in watchlist?.movies_wishlists"
            :key="movie.tmdb_id"
            :value="movie.title || movie.title_english"
          /></datalist></label
      ><button
        class="mm-button"
        type="button"
        @click="
          searchText = '';
          applySearch();
        "
      >
        Limpar
      </button>
      <template v-if="isOwner"
        ><label class="mm-checkbox"
          ><input
            type="checkbox"
            :checked="watchlist?.shareable"
            :disabled="mutationBlocked"
            @change="onShareToggle"
          />Lista pública</label
        ><button
          v-if="!allowDrag"
          class="mm-button"
          type="button"
          :disabled="mutationBlocked"
          @click="startReorder"
        >
          Reordenar
        </button></template
      >
    </form>
    <MovieWatchlistCleanupBtn
      v-if="isOwner"
      :key="viewKey"
      :wishlist="watchlist"
      :disabled="mutationBlocked"
      :remove-rated="removeRated"
    />
    <div v-if="allowDrag" class="mm-reorder-toolbar" role="status">
      <p>Arraste os filmes ou use as setas para reordenar.</p>
      <button class="mm-button mm-button-primary" :disabled="saving" @click="saveReorder">
        Salvar ordem</button
      ><button class="mm-button" :disabled="saving" @click="cancelReorder">Cancelar</button>
    </div>
    <p v-if="loading" role="status">Carregando lista…</p>
    <p v-if="error" class="mm-error" role="alert">
      {{ error }} <button class="mm-button" @click="loadWatchlist">Tentar novamente</button>
    </p>
    <div class="mm-poster-grid">
      <article
        v-for="(movie, index) in filteredMovies"
        :key="movie.tmdb_id"
        :draggable="allowDrag && !saving"
        @dragstart="draggedIndex = index"
        @dragover.prevent
        @drop="drop(index)"
        @dragend="draggedIndex = null"
        :class="{ 'mm-dragging': draggedIndex === index }"
      >
        <MovieWatchlistImageCard
          :movie="movie"
          :wishlists="otherWatchlists"
          :show-remove-item="isOwner"
          :disabled="loading || saving || allowDrag"
          :animate="!allowDrag"
          @open="openSummary(movie.tmdb_id)"
          @remove-movie="confirmRemove(movie)"
          @copy-url="copyMovieUrl(movie.tmdb_id)"
        />
        <div v-if="allowDrag" class="mm-actions">
          <button
            class="mm-button"
            :disabled="saving || index === 0"
            @click="move(index, index - 1)"
            :aria-label="`Mover ${movie.title} para antes`"
          >
            ←</button
          ><button
            class="mm-button"
            :disabled="saving || index === filteredMovies.length - 1"
            @click="move(index, index + 1)"
            :aria-label="`Mover ${movie.title} para depois`"
          >
            →
          </button>
        </div>
      </article>
    </div>
    <p v-if="!loading && !error && !filteredMovies.length" class="mm-empty">
      {{
        searchText
          ? 'Nenhum filme corresponde à busca.'
          : 'Ainda não há filmes nesta lista. Descubra algo para sua próxima sessão.'
      }}
    </p>
    <BaseFloatingActionBtn />
    <BaseConfirmDialog :key="viewKey" ref="confirmDialogRef" @ok="removeMovie" />
    <BaseDialogFormMovieSummary v-model="showSummary" :movie-id="summaryId" />
  </BaseContainerMain>
</template>
<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import {
  copyWatchlistMovies,
  moveWatchlistMovie,
  isCurrentWatchlistOperation,
} from '../utils/WatchlistDraft';
import BaseFloatingActionBtn from 'src/core/components/BaseFloatingActionBtn.vue';
import BaseContainerMain from 'src/core/components/BaseContainerMain.vue';
import BaseConfirmDialog from 'src/core/components/BaseConfirmDialog.vue';
import BaseDialogFormMovieSummary from 'src/core/components/BaseDialogFormMovieSummary.vue';
import MovieWatchlistPageTitle from '../components/MovieWatchlistPageTitle.vue';
import MovieWatchlistCleanupBtn from '../components/MovieWatchlistCleanupBtn.vue';
import MovieWatchlistImageCard from '../components/MovieWatchlistImageCard.vue';
import MovieWatchlistService from '../services/MovieWatchlistService';
import { useMovieWatchlistStore } from '../stores/MovieWatchlistStore';
import { useUserStore } from 'src/core/stores/UserStore';
import type { WatchlistType } from 'src/core/types/movie-watchlist/WatchlistType';
import { showError, showSuccess } from 'src/core/utils/NotificationUtils';
const route = useRoute();
const userStore = useUserStore();
const store = useMovieWatchlistStore();
const watchlist = ref<WatchlistType>();
const searchText = ref('');
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const allowDrag = ref(false);
const reorderDraft = ref<WatchlistType['movies_wishlists']>([]);
const draggedIndex = ref<number | null>(null);
const summaryId = ref<number>();
const showSummary = ref(false);
const removeTarget = ref<{ listId: string; movieId: number; accountId: string }>();
const confirmDialogRef = ref<InstanceType<typeof BaseConfirmDialog>>();
const viewKey = computed(() => `${String(route.params.id || '')}:${userStore.user.id}`);
const isOwner = computed(
  () =>
    !!watchlist.value &&
    userStore.user.isLoged &&
    watchlist.value.user.id === userStore.user.id &&
    watchlist.value.id === String(route.params.id || ''),
);
const mutationBlocked = computed(
  () => loading.value || saving.value || allowDrag.value || !isOwner.value,
);
const otherWatchlists = computed(() =>
  store.watchlists.filter(
    (list) => list.id !== watchlist.value?.id && list.user.id === userStore.user.id,
  ),
);
const filteredMovies = computed(() => {
  if (allowDrag.value) return reorderDraft.value;
  const query = searchText.value.trim().toLocaleLowerCase();
  return (watchlist.value?.movies_wishlists || []).filter(
    (movie) =>
      !query ||
      (movie.title || '').toLocaleLowerCase().includes(query) ||
      (movie.title_english || '').toLocaleLowerCase().includes(query),
  );
});
let loadVersion = 0;
let disposed = false;
onMounted(loadWatchlist);
watch(viewKey, loadWatchlist);
onBeforeUnmount(() => {
  disposed = true;
  loadVersion++;
});
async function loadWatchlist() {
  const version = ++loadVersion;
  const id = String(route.params.id || '');
  const accountId = userStore.user.id;
  loading.value = true;
  error.value = '';
  allowDrag.value = false;
  saving.value = false;
  watchlist.value = undefined;
  reorderDraft.value = [];
  removeTarget.value = undefined;
  showSummary.value = false;
  searchText.value = '';
  const current = () =>
    !disposed &&
    version === loadVersion &&
    userStore.user.id === accountId &&
    String(route.params.id || '') === id;
  if (!userStore.user.isLoged || !id) {
    loading.value = false;
    return;
  }
  try {
    await store.getWatchlists();
    if (!current()) return;
    const result = await MovieWatchlistService.searchWatchlistById(id);
    if (current()) setWatchlist(result);
  } catch {
    if (current())
      error.value = 'Não foi possível carregar a lista. Ela pode não existir ou ser privada.';
  } finally {
    if (current()) loading.value = false;
  }
}
function setWatchlist(value: WatchlistType) {
  if (disposed || value.id !== String(route.params.id || '')) return;
  watchlist.value = { ...value, movies_wishlists: [...(value.movies_wishlists || [])] };
  const index = store.watchlists.findIndex((list) => list.id === value.id);
  if (index !== -1) store.watchlists[index] = value;
}
function applySearch() {
  /* Filtering is derived from the current query. */
}
async function persist(value: WatchlistType, reorder = false): Promise<boolean> {
  if (
    !isOwner.value ||
    loading.value ||
    saving.value ||
    value.id !== watchlist.value?.id ||
    (allowDrag.value && !reorder)
  )
    return false;
  const id = value.id;
  const accountId = userStore.user.id;
  const version = loadVersion;
  const session = userStore.user;
  const scope = { listId: id, accountId, generation: version };
  const current = () =>
    !disposed &&
    session === userStore.user &&
    isCurrentWatchlistOperation(scope, {
      listId: String(route.params.id || ''),
      accountId: userStore.user.id,
      generation: loadVersion,
    }) &&
    isOwner.value;
  const payload = {
    ...value,
    movies_wishlists: copyWatchlistMovies(value.movies_wishlists),
  };
  saving.value = true;
  try {
    const result = await MovieWatchlistService.updateWatchlist(payload);
    if (!current()) return false;
    setWatchlist(result);
    return true;
  } catch {
    if (current()) showError('Erro ao salvar lista de filmes');
    return false;
  } finally {
    if (current()) saving.value = false;
  }
}
async function renameWatchlist(name: string) {
  if (mutationBlocked.value || !watchlist.value) return false;
  const saved = await persist({ ...watchlist.value, name });
  if (saved) showSuccess('Nome atualizado');
  return saved;
}
async function removeRated(ids: number[]) {
  if (mutationBlocked.value || !watchlist.value) return false;
  const saved = await persist({
    ...watchlist.value,
    movies_wishlists: watchlist.value.movies_wishlists.filter(
      (movie) => !ids.includes(movie.tmdb_id),
    ),
  });
  if (saved) showSuccess('Filmes removidos da lista');
  return saved;
}
async function onShareToggle(event: Event) {
  const input = event.target as HTMLInputElement;
  await changeShareable(input.checked);
  if (!disposed) input.checked = watchlist.value?.shareable || false;
}
async function changeShareable(value: boolean) {
  if (!mutationBlocked.value && watchlist.value)
    await persist({ ...watchlist.value, shareable: value });
}
function openSummary(id: number) {
  if (loading.value) return;
  summaryId.value = id;
  showSummary.value = true;
}
function confirmRemove(movie: WatchlistType['movies_wishlists'][number]) {
  if (mutationBlocked.value || !watchlist.value) return;
  removeTarget.value = {
    listId: watchlist.value.id,
    movieId: movie.tmdb_id,
    accountId: userStore.user.id,
  };
  confirmDialogRef.value?.show({
    title: 'Remover filme?',
    message: `Remover “${movie.title || movie.title_english}” desta lista?`,
    focus: 'cancel',
    ok: 'Remover',
  });
}
async function removeMovie() {
  const target = removeTarget.value;
  removeTarget.value = undefined;
  if (
    mutationBlocked.value ||
    !watchlist.value ||
    !target ||
    target.listId !== watchlist.value.id ||
    target.accountId !== userStore.user.id
  )
    return;
  const saved = await persist({
    ...watchlist.value,
    movies_wishlists: watchlist.value.movies_wishlists.filter(
      (movie) => movie.tmdb_id !== target.movieId,
    ),
  });
  if (saved) showSuccess('Filme removido da lista');
}
async function copyMovieUrl(id: number) {
  try {
    await navigator.clipboard.writeText(`${window.location.origin}/movie/discover?movie=${id}`);
    showSuccess('URL copiada');
  } catch {
    showError('Erro ao copiar URL');
  }
}
function startReorder() {
  if (mutationBlocked.value || !watchlist.value) return;
  searchText.value = '';
  reorderDraft.value = copyWatchlistMovies(watchlist.value.movies_wishlists);
  allowDrag.value = true;
}
function move(from: number, to: number) {
  if (
    !allowDrag.value ||
    saving.value ||
    !isOwner.value ||
    to < 0 ||
    to >= reorderDraft.value.length
  )
    return;
  reorderDraft.value = moveWatchlistMovie(reorderDraft.value, from, to);
}
function drop(index: number) {
  if (draggedIndex.value !== null) move(draggedIndex.value, index);
  draggedIndex.value = null;
}
async function saveReorder() {
  if (!watchlist.value || !allowDrag.value || !isOwner.value) return;
  if (await persist({ ...watchlist.value, movies_wishlists: reorderDraft.value }, true)) {
    allowDrag.value = false;
    reorderDraft.value = [];
    showSuccess('Lista reordenada');
  }
}
function cancelReorder() {
  if (saving.value) return;
  allowDrag.value = false;
  reorderDraft.value = [];
  draggedIndex.value = null;
}
</script>

<style scoped>
.mm-poster-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 28px 20px;
  margin-top: 24px;
}
.mm-filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 16px;
  margin: 24px 0;
}
.mm-search-field {
  display: grid;
  gap: 8px;
  flex: 1;
}
.mm-checkbox {
  display: flex;
  gap: 8px;
  align-items: center;
}
.mm-checkbox input {
  width: auto;
}
.mm-reorder-toolbar {
  padding: 16px;
  border: 1px solid var(--primary);
  border-radius: 12px;
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}
.mm-dragging {
  opacity: 0.5;
}
.mm-back-link {
  display: inline-block;
  margin-bottom: 20px;
  color: var(--primary);
}
@media (max-width: 600px) {
  .mm-poster-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px 12px;
  }
}
</style>
