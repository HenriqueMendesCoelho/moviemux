<template>
  <BaseContainerMain>
    <router-link class="mm-back-link" :to="{ name: 'movie-watchlist-list' }"
      ><BaseIcon name="chevron-left" /> Minhas listas</router-link
    >
    <template v-if="watchlist"
      ><div class="mm-detail-top">
        <MovieWatchlistPageTitle
          :key="viewKey"
          :watchlist="watchlist"
          :disabled="mutationBlocked"
          :rename="renameWatchlist"
        />
        <div v-if="isOwner" class="mm-list-utilities">
          <label class="mm-visibility-control"
            ><input
              type="checkbox"
              :checked="watchlist?.shareable"
              :disabled="mutationBlocked"
              @change="onShareToggle"
            /><span>Lista pública</span></label
          >
          <button
            v-if="!allowDrag"
            class="mm-button mm-reorder-entry"
            type="button"
            :disabled="mutationBlocked || filteredMovies.length < 2"
            @click="startReorder"
          >
            <BaseIcon name="grip" />Reordenar
          </button>
        </div>
      </div>
      <div v-if="allowDrag" class="mm-reorder-intro">
        <strong>Organize do seu jeito</strong>
        <p id="reorder-help">Arraste pela alça ou use as setas. Salve para confirmar sua ordem.</p>
      </div>
      <div v-if="allowDrag" class="mm-reorder-toolbar">
        <span class="mm-unsaved-label">Ordem não salva</span>
        <div class="mm-actions">
          <button class="mm-button" :disabled="saving || isSwapping" @click="cancelReorder">
            Cancelar</button
          ><button
            class="mm-button mm-button-primary"
            :disabled="saving || isSwapping"
            @click="saveReorder"
          >
            {{ saving ? 'Salvando…' : 'Salvar ordem' }}
          </button>
        </div>
      </div>
      <MovieWatchlistCleanupBtn
        v-if="isOwner && !allowDrag"
        :key="viewKey"
        :wishlist="watchlist"
        :disabled="mutationBlocked"
        :remove-rated="removeRated"
      />
      <form v-if="!allowDrag" class="mm-filter-bar" @submit.prevent="applySearch">
        <label class="mm-search-field"
          ><BaseIcon name="search" /><span class="mm-sr-only">Buscar nesta lista</span
          ><input
            v-model="searchText"
            :disabled="loading || saving"
            list="watchlist-titles"
            placeholder="Buscar nesta lista"
            @input="applySearch" /><datalist id="watchlist-titles">
            <option
              v-for="movie in watchlist?.movies_wishlists"
              :key="movie.tmdb_id"
              :value="movie.title || movie.title_english"
            /></datalist
        ></label>
        <button
          v-if="searchText"
          class="mm-clear-search"
          type="button"
          aria-label="Limpar busca"
          @click="
            searchText = '';
            applySearch();
          "
        >
          <BaseIcon name="close" />
        </button>
        <span class="mm-result-count"
          >{{ filteredMovies.length }} {{ filteredMovies.length === 1 ? 'filme' : 'filmes' }}</span
        >
      </form> </template
    ><WatchlistLoadingState v-if="loading && !watchlist" detail />
    <p v-if="error" class="mm-error" role="alert">
      {{ error }} <button class="mm-button" @click="loadWatchlist">Tentar novamente</button>
    </p>
    <p v-if="watchlist" class="mm-sr-only" role="status" aria-live="polite">
      {{ reorderAnnouncement }}
    </p>
    <div
      ref="posterGrid"
      v-show="!!watchlist"
      class="mm-poster-grid"
      :class="{ 'mm-reorder-grid': allowDrag }"
      :aria-describedby="allowDrag ? 'reorder-help' : undefined"
    >
      <div
        v-for="(movie, index) in filteredMovies"
        :key="allowDrag ? `position-${index}` : movie.tmdb_id"
        class="mm-poster-slot"
        :data-swapy-slot="allowDrag ? `position-${index}` : undefined"
      >
        <article
          :key="movie.tmdb_id"
          class="mm-sortable-film"
          :data-swapy-item="allowDrag ? String(movie.tmdb_id) : undefined"
        >
          <div v-if="allowDrag" class="mm-drag-bar">
            <span class="mm-order-number">{{ index + 1 }}</span
            ><button
              class="mm-drag-handle"
              data-swapy-handle
              type="button"
              :disabled="saving"
              :aria-label="`Arrastar ${movie.title || movie.title_english} para reordenar`"
              title="Arraste para reordenar"
              @click.stop.prevent
            >
              <BaseIcon name="grip" /><span>Mover</span>
            </button>
          </div>
          <div data-swapy-no-drag>
            <MovieWatchlistImageCard
              :movie="movie"
              :wishlists="otherWatchlists"
              :show-remove-item="isOwner"
              :disabled="loading || saving || allowDrag"
              :reordering="allowDrag"
              :animate="!allowDrag"
              @open="openSummary(movie.tmdb_id)"
              @remove-movie="confirmRemove(movie)"
              @copy-url="copyMovieUrl(movie.tmdb_id)"
            />
          </div>
          <div v-if="allowDrag" class="mm-order-actions" data-swapy-no-drag>
            <button
              class="mm-order-button"
              :disabled="saving || isSwapping || index === 0"
              @click="move(index, index - 1)"
              :data-focus-key="`before-${movie.tmdb_id}`"
              :aria-label="`Mover ${movie.title || movie.title_english} para antes`"
            >
              <BaseIcon name="chevron-left" /><span>Antes</span>
            </button>
            <button
              class="mm-order-button"
              :disabled="saving || isSwapping || index === filteredMovies.length - 1"
              @click="move(index, index + 1)"
              :data-focus-key="`after-${movie.tmdb_id}`"
              :aria-label="`Mover ${movie.title || movie.title_english} para depois`"
            >
              <span>Depois</span><BaseIcon name="chevron-right" />
            </button>
          </div>
        </article>
      </div>
    </div>
    <p v-if="watchlist && !loading && !error && !filteredMovies.length" class="mm-empty">
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
import { computed, onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue';
import type { Swapy } from 'swapy';
import BaseIcon from 'src/core/components/BaseIcon.vue';
import { useRoute } from 'vue-router';
import {
  copyWatchlistMovies,
  moveWatchlistMovie,
  isCurrentWatchlistOperation,
  orderMoviesBySlots,
} from '../utils/WatchlistDraft';
import BaseFloatingActionBtn from 'src/core/components/BaseFloatingActionBtn.vue';
import WatchlistLoadingState from '../components/WatchlistLoadingState.vue';
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
const loading = ref(true);
const saving = ref(false);
const error = ref('');
const allowDrag = ref(false);
const reorderDraft = ref<WatchlistType['movies_wishlists']>([]);
const posterGrid = ref<HTMLElement>();
const isSwapping = ref(false);
const reorderAnnouncement = ref('');
let swapy: Swapy | undefined;
let swapyGeneration = 0;
let settleTimer: ReturnType<typeof setTimeout> | undefined;
let mediaQuery: MediaQueryList | undefined;
function destroySwapy() {
  swapyGeneration++;
  if (settleTimer) clearTimeout(settleTimer);
  settleTimer = undefined;
  swapy?.destroy();
  swapy = undefined;
  isSwapping.value = false;
}
async function initializeSwapy() {
  destroySwapy();
  if (!import.meta.client || !allowDrag.value || disposed) return;
  const generation = swapyGeneration;
  await nextTick();
  try {
    const { createSwapy } = await import('swapy');
    if (generation !== swapyGeneration || !allowDrag.value || !posterGrid.value || disposed) return;
    swapy = createSwapy(posterGrid.value, {
      manualSwap: true,
      animation: mediaQuery?.matches ? 'none' : 'dynamic',
      swapMode: 'hover',
      dragOnHold: false,
      autoScrollOnDrag: true,
      enabled: !saving.value,
    });
    swapy.onBeforeSwap(() => allowDrag.value && !saving.value && isOwner.value);
    swapy.onSwapStart(() => {
      if (generation === swapyGeneration) isSwapping.value = true;
    });
    swapy.onSwap((event) => {
      if (generation !== swapyGeneration || saving.value || !isOwner.value) return;
      reorderDraft.value = orderMoviesBySlots(reorderDraft.value, event.newSlotItemMap.asArray);
    });
    swapy.onSwapEnd((event) => {
      if (generation !== swapyGeneration) return;
      reorderAnnouncement.value = event.hasChanged
        ? 'Ordem alterada. Salve para confirmar ou cancele para voltar à ordem anterior.'
        : 'Ordem mantida.';
      if (!event.hasChanged) {
        isSwapping.value = false;
        return;
      }
      // Swapy 1.0.5 captures the handle DOM node at creation. Vue manualSwap
      // recreates moved item nodes; rebind after its 300ms dynamic drop animation.
      // Keep controls locked during that short settling period, including touch.
      swapy?.enable(false);
      settleTimer = setTimeout(
        () => {
          if (generation === swapyGeneration) void initializeSwapy();
        },
        mediaQuery?.matches ? 32 : 320,
      );
    });
  } catch {
    reorderAnnouncement.value =
      'Arraste indisponível neste navegador. Use os botões Antes e Depois para reordenar.';
  }
}
watch(
  allowDrag,
  (enabled) => {
    if (enabled) void initializeSwapy();
    else destroySwapy();
  },
  { flush: 'post' },
);
watch(saving, (value) => swapy?.enable(!value && allowDrag.value));
function onMotionPreferenceChange() {
  if (allowDrag.value) void initializeSwapy();
}
onMounted(() => {
  mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  mediaQuery.addEventListener('change', onMotionPreferenceChange);
});
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
  destroySwapy();
  mediaQuery?.removeEventListener('change', onMotionPreferenceChange);
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
  if (loading.value || saving.value || allowDrag.value) return;
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
async function move(from: number, to: number) {
  if (
    !allowDrag.value ||
    saving.value ||
    isSwapping.value ||
    !isOwner.value ||
    to < 0 ||
    to >= reorderDraft.value.length
  )
    return;
  const focusKey = (document.activeElement as HTMLElement | null)?.dataset.focusKey;
  destroySwapy();
  reorderDraft.value = moveWatchlistMovie(reorderDraft.value, from, to);
  reorderAnnouncement.value = `Filme movido para a posição ${to + 1}. Salve para confirmar.`;
  await initializeSwapy();
  await nextTick();
  if (focusKey) {
    const button = posterGrid.value?.querySelector<HTMLButtonElement>(
      `[data-focus-key="${focusKey}"]`,
    );
    if (button && !button.disabled) button.focus();
    else
      button?.closest('article')?.querySelector<HTMLButtonElement>('[data-swapy-handle]')?.focus();
  }
}
async function saveReorder() {
  if (!watchlist.value || !allowDrag.value || !isOwner.value || isSwapping.value) return;
  if (await persist({ ...watchlist.value, movies_wishlists: reorderDraft.value }, true)) {
    allowDrag.value = false;
    reorderDraft.value = [];
    showSuccess('Lista reordenada');
  }
}
function cancelReorder() {
  if (saving.value || isSwapping.value) return;
  allowDrag.value = false;
  reorderDraft.value = [];
  reorderAnnouncement.value = 'Alterações de ordem descartadas.';
}
</script>

<style scoped>
.mm-back-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin: 0 0 16px;
  color: var(--mm-muted);
  font-size: 0.8rem;
  text-decoration: none;
  min-height: 28px;
}
.mm-back-link svg {
  width: 16px;
}
.mm-back-link:hover {
  color: var(--mm-text);
}
.mm-detail-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px 20px;
  margin-bottom: 20px;
}
.mm-list-utilities {
  display: flex;
  align-items: center;
  gap: 16px;
}
.mm-visibility-control {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  color: var(--mm-muted);
  min-height: 44px;
}
.mm-visibility-control input {
  width: 16px;
  height: 16px;
  accent-color: var(--primary);
}
.mm-reorder-entry {
  display: inline-flex;
  gap: 8px;
  align-items: center;
}
.mm-filter-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 20px;
  position: relative;
}
.mm-search-field {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  max-width: 460px;
  border: 1px solid var(--mm-border);
  background: var(--mm-surface);
  padding: 0 13px;
  border-radius: 10px;
  color: var(--mm-muted);
}
.mm-search-field:focus-within {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
.mm-search-field input {
  min-width: 0;
  flex: 1;
  width: 100%;
  border: 0;
  background: transparent;
  border-radius: 0;
  padding: 12px 0;
  outline: none;
  box-shadow: none;
  font-size: 0.85rem;
}
.mm-search-field input:focus {
  outline: none;
}
.mm-clear-search {
  min-width: 44px;
  min-height: 44px;
  display: grid;
  place-items: center;
  border-radius: 8px;
}
.mm-result-count {
  margin-left: auto;
  font-size: 0.8rem;
  color: var(--mm-muted);
  white-space: nowrap;
}
.mm-poster-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 24px 18px;
}
.mm-poster-slot {
  min-width: 0;
  border-radius: 14px;
}
.mm-sortable-film {
  min-width: 0;
  touch-action: pan-y;
}
.mm-reorder-grid .mm-sortable-film {
  padding: 8px;
  border: 1px solid var(--mm-border);
  border-radius: 14px;
  background: var(--mm-surface);
}
.mm-reorder-intro {
  margin-bottom: 12px;
}
.mm-reorder-intro strong {
  font-size: 0.9rem;
}
.mm-reorder-intro p {
  margin: 4px 0 0;
  color: var(--mm-muted);
  font-size: 0.78rem;
}
.mm-reorder-toolbar {
  position: sticky;
  top: calc(var(--mm-sticky-top, 0px) + 8px);
  z-index: 18;
  box-shadow: 0 4px 16px #0001;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  border: 1px solid color-mix(in srgb, var(--primary) 35%, var(--mm-border));
  border-radius: 12px;
  background: color-mix(in srgb, var(--primary) 5%, var(--mm-surface));
  padding: 8px 12px;
  margin-bottom: 20px;
}
.mm-unsaved-label {
  color: var(--mm-muted);
  font-size: 0.75rem;
}
.mm-reorder-toolbar p {
  color: var(--mm-muted);
  font-size: 0.78rem;
  margin: 5px 0 0;
  max-width: 470px;
}
.mm-reorder-toolbar .mm-actions {
  margin: 0;
}
.mm-drag-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 5px;
  margin: -2px 0 5px;
}
.mm-order-number {
  color: var(--mm-muted);
  font-size: 0.75rem;
  padding-left: 6px;
  font-variant-numeric: tabular-nums;
}
.mm-drag-handle {
  display: inline-flex;
  min-height: 44px;
  min-width: 44px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 8px;
  padding: 7px 10px;
  color: var(--mm-text);
  background: var(--mm-raised);
  cursor: grab;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  font-size: 0.75rem;
}
.mm-drag-handle:active {
  cursor: grabbing;
}
.mm-drag-handle svg {
  pointer-events: none;
}
.mm-order-actions {
  display: flex;
  justify-content: space-between;
  border-top: 1px solid var(--mm-border);
  margin-top: 10px;
  padding-top: 6px;
  gap: 4px;
}
.mm-order-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  gap: 3px;
  font-size: 0.7rem;
  border-radius: 8px;
  flex: 1;
}
.mm-order-button svg {
  width: 14px;
}
.mm-order-button:hover:not(:disabled) {
  background: var(--mm-raised);
}
.mm-order-button:disabled {
  opacity: 0.35;
}
[data-swapy-highlighted] {
  outline: 2px solid var(--primary);
  outline-offset: 4px;
  background: color-mix(in srgb, var(--primary) 8%, transparent);
}
[data-swapy-dragging] {
  box-shadow: 0 18px 44px #0005;
  border-color: var(--primary) !important;
  cursor: grabbing;
}
@media (max-width: 600px) {
  .mm-back-link {
    margin-bottom: 8px;
  }
  .mm-detail-top {
    gap: 6px;
    margin-bottom: 12px;
  }
  .mm-list-utilities {
    width: 100%;
    justify-content: space-between;
    gap: 8px;
  }
  .mm-poster-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px 12px;
  }
  .mm-reorder-toolbar {
    padding: 8px;
    gap: 8px;
    flex-wrap: nowrap;
  }
  .mm-reorder-toolbar .mm-button {
    min-height: 44px;
    padding: 8px 12px;
    font-size: 0.75rem;
  }
  .mm-reorder-toolbar .mm-actions {
    margin-left: auto;
    justify-content: flex-end;
    flex-wrap: nowrap;
    gap: 6px;
  }
  .mm-result-count {
    font-size: 0.7rem;
  }
  .mm-filter-bar {
    gap: 7px;
  }
  .mm-search-field {
    gap: 7px;
    padding-inline: 10px;
  }
  .mm-search-field input {
    font-size: 0.8rem;
  }
}
@media (prefers-reduced-motion: reduce) {
  .mm-sortable-film,
  .mm-poster-slot {
    transition: none !important;
    animation: none !important;
  }
}
</style>
