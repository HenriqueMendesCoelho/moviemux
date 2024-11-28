<template>
  <BaseContainerMain>
    <div class="row full-width justify-center">
      <MovieWatchlistPageTitle :watchlist="watchlist" />
      <BaseHorizontalSeparator class="q-mb-xl" />
      <div class="col-12 scroll">
        <BaseSearchToolbar
          v-model:input-search="searchText"
          @search="firstSearch()"
          @refresh="resetSearch()"
          @input-search-focus="
            ($event: boolean) => {
              if (!$event) selectedIndexMenu = undefined;
              menuIsFocused = $event;
            }
          "
          @keydown-enter:input-search="searchFromIndexMenu"
          @keydown-up:input-search="moveSelection(-1)"
          @keydown-down:input-search="moveSelection(1)"
          @keydown-esc:input-search="selectedIndexMenu = undefined"
          :show-select="false"
          :separeted-input-event="true"
        >
          <template #prepend>
            <div>
              <q-btn icon="arrow_back_ios" flat round @click="backToWatchlists()" />
              <BaseTooltip :delay="500">Voltar para minhas listas</BaseTooltip>
            </div>
          </template>
          <template #append v-if="watchlist?.user.id === userId">
            <MovieWatchlistCleanupBtn :wishlist="watchlist" @update:wishlist="watchlist = $event" />
            <div>
              <q-toggle
                :model-value="shareable"
                @update:model-value="changeShareable"
                size="xl"
                color="kb-primary"
                checked-icon="public"
                unchecked-icon="public_off"
              />
              <BaseTooltip :delay="500">{{ shareable ? 'Lista Pública' : 'Lista Privada' }}</BaseTooltip>
            </div>
            <div class="mobile-hide">
              <div>
                <q-btn @click="allowDrag = true" icon="reorder" :disable="allowDrag" flat round />
                <BaseTooltip v-if="!allowDrag" :delay="500">Reordernar lista</BaseTooltip>
              </div>
            </div>
          </template>
          <template #input-search>
            <q-menu class="bg-grey-mid text-white" fit no-focus no-refocus no-parent-event v-model="showMenu">
              <q-list dense dark>
                <q-item
                  ref="itensMenuRef"
                  active-class="text-kb-primary bg-grey-mid2"
                  v-for="(movie, index) in moviesWhenTyping"
                  :key="movie.tmdb_id"
                  :active="selectedIndexMenu === index"
                  bordered
                  clickable
                >
                  <q-item-section @click="searchFromMenu(movie.title)" v-close-popup class="q-pl-sm">{{
                    movie.title || movie.title_english || 'Erro ao carregar título'
                  }}</q-item-section>
                </q-item>
                <q-separator dark v-if="moviesWhenTyping?.length ? moviesWhenTyping?.length > 1 : false" />
              </q-list>
            </q-menu>
          </template>
        </BaseSearchToolbar>
      </div>
      <div class="row justify-center q-mt-lg">
        <div class="row justify-center" :class="isDesktop ? 'q-col-gutter-xl' : 'q-col-gutter-xs'" v-if="moviesFiltered?.length">
          <transition-group type="transition" name="flip-list">
            <div
              class="col-auto"
              v-for="(movie, index) in moviesFiltered"
              :key="movie.tmdb_id"
              :draggable="allowDrag"
              @dragstart="dragStart(index)"
              @dragover.prevent
              @drop="drop(index)"
              :style="{ opacity: draggedItemIndex === index ? '0.5' : '1' }"
            >
              <MovieWatchlistImageCard
                :movie="movie"
                :wishlists="otherWishlists"
                :show-remove-item="watchlist?.user.id === userId"
                :animate="!allowDrag"
                @open="openDialogSummary(movie.tmdb_id)"
                @remove-movie="openConfirmDialogRemoveMovie(movie)"
                @copy-url="copyMovieUrl(movie.tmdb_id)"
                :style="allowDrag && 'cursor: all-scroll'"
              />
            </div>
          </transition-group>
          <BaseFloatingActionBtn class="desktop-only" />
        </div>
        <div class="row justify-center" v-else>
          <div class="text-h3 text-white">Ainda não há filmes nessa lista...</div>
        </div>
      </div>
      <BaseConfirmDialog ref="confirmDialogRef" @ok="deleteMovieFromWatchlist()" />
      <BaseDialogFormMovieSummary v-model="showDialogMovieSummary" :movie-id="movieIdDialog" />
    </div>
  </BaseContainerMain>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { copyToClipboard, QItem, useQuasar } from 'quasar';

import BaseContainerMain from 'src/core/components/BaseContainerMain.vue';
import BaseHorizontalSeparator from 'src/core/components/BaseHorizontalSeparator.vue';
import BaseConfirmDialog from 'src/core/components/BaseConfirmDialog.vue';
import BaseSearchToolbar from 'src/core/components/BaseSearchToolbar.vue';
import BaseDialogFormMovieSummary from 'src/core/components/BaseDialogFormMovieSummary.vue';
import BaseFloatingActionBtn from 'src/core/components/BaseFloatingActionBtn.vue';
import BaseTooltip from 'src/core/components/BaseTooltip.vue';

import { useUserStore } from 'src/core/stores/UserStore';
import { WatchlistType } from 'src/core/types/movie-watchlist/WatchlistType';
import { showError, showSuccess } from 'src/core/utils/NotificationUtils';
import { hideLoading, showLoading } from 'src/core/utils/LoadingUtils';
import { confirmReorder, notificationReorder } from '../utils/MovieWatchlistNotificationUtils';
import { useMovieWatchlistStore } from '../stores/MovieWatchlistStore';
import MovieWatchlistService from '../services/MovieWatchlistService';

import MovieWatchlistImageCard from '../components/MovieWatchlistImageCard.vue';
import MovieWatchlistCleanupBtn from '../components/MovieWatchlistCleanupBtn.vue';
import MovieWatchlistPageTitle from '../components/MovieWatchlistPageTitle.vue';

const $q = useQuasar();
const isDesktop = $q.platform.is.desktop;
const router = useRouter();
const route = useRoute();

type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

const idPathParam = computed(() => route.params.id?.toString() || '');
const userStore = useUserStore();
const userId = userStore.user.id;
const searchText = ref('');
const menuIsFocused = ref(false);
const watchlist = ref<WatchlistType>();
const moviesFiltered = ref<WatchlistType['movies_wishlists']>();
const moviesWhenTyping = ref<WatchlistType['movies_wishlists']>();
const shareable = ref(false);
const showDialogMovieSummary = ref(false);
const movieIdDialog = ref<number>();
const movieIdToDelete = ref<number>();
const otherWishlists = ref<WatchlistType[]>([]);
const confirmDialogRef = ref<InstanceType<typeof BaseConfirmDialog>>();
const showMenu = computed<boolean>(() => {
  return !!searchText.value && menuIsFocused.value && !!moviesWhenTyping.value?.length;
});
const allowDrag = ref(false);
const draggedItemIndex = ref<number | null>(null);
const selectedIndexMenu = ref<number | undefined>(undefined);
const itensMenuRef = ref<InstanceType<typeof QItem>[]>();
const watchlistStore = useMovieWatchlistStore();

onMounted(async () => {
  if (idPathParam.value) {
    await searchWatchlistById();
  }
  initializeVars();
});

watch(
  () => searchText.value,
  () => {
    moviesWhenTyping.value = filterMovies();
  }
);
watch(
  () => watchlist?.value,
  () => {
    if (!watchlist?.value) {
      return;
    }
    moviesFiltered.value = watchlist.value?.movies_wishlists;
    shareable.value = watchlist.value?.shareable || false;
  }
);
watch(
  () => allowDrag.value,
  (val) => {
    if (!val) {
      return;
    }
    notificationReorder();
    confirmReorder({
      done() {
        reorderWatchlistAndUpdate();
      },
      cancel() {
        allowDrag.value = false;
        searchWatchlistById();
      },
    });
  }
);

function firstSearch() {
  searchMoviesAction();
}
function resetSearch() {
  searchText.value = '';
  searchMoviesAction();
}
function searchMoviesAction() {
  moviesFiltered.value = filterMovies();
}
function filterMovies() {
  if (!searchText.value) {
    return watchlist.value?.movies_wishlists;
  }

  return watchlist.value?.movies_wishlists?.filter(
    (m) => m.title?.includes(searchText.value) || m.title_english.includes(searchText.value)
  );
}
function searchFromMenu(title?: string) {
  searchText.value = title || '';
  searchMoviesAction();
}
function initializeVars() {
  otherWishlists.value = watchlistStore.watchlists.filter((w) => w.id !== watchlist.value?.id);
  moviesFiltered.value = watchlist.value?.movies_wishlists;
  shareable.value = watchlist.value?.shareable || false;
}
async function searchWatchlistById() {
  if (!idPathParam.value) {
    return;
  }
  if (!watchlistStore.watchlists.length) {
    await watchlistStore.getWatchlists();
  }

  const list = watchlistStore.watchlists.find((w) => w.id === idPathParam.value);
  if (list) {
    watchlist.value = { ...list, movies_wishlists: list.movies_wishlists?.length ? [...list.movies_wishlists] : [] };
    return;
  }

  try {
    showLoading();
    const res = await MovieWatchlistService.searchWatchlistById(idPathParam.value);

    if (!res) {
      showError('Lista não existe ou não é pública');
      router.push('/home');
    }

    watchlist.value = res;
    moviesFiltered.value = res?.movies_wishlists;
  } catch {
    showError('Erro ao carregar lista de filmes');
    router.push('/home');
  } finally {
    hideLoading();
  }
}
async function changeShareable(val: boolean) {
  if (!watchlist.value) {
    return;
  }

  shareable.value = val;
  watchlist.value.shareable = val;
  await updateWatchlist(watchlist.value);
}
function openConfirmDialogRemoveMovie(movie: ArrayElement<WatchlistType['movies_wishlists']>) {
  movieIdToDelete.value = movie.tmdb_id;
  confirmDialogRef.value?.show({
    message: `Tem certeza que deseja remover '${movie.title || movie.title_english}' dessa lista? Caso remova não há como desfazer a ação.`,
    focus: 'cancel',
    title: 'Quer mesmo remover?',
    ok: 'Sim',
  });
}
async function deleteMovieFromWatchlist() {
  if (!watchlist.value) {
    return;
  }

  watchlist.value.movies_wishlists = watchlist.value?.movies_wishlists.filter((m) => m.tmdb_id !== movieIdToDelete.value);
  const res = await updateWatchlist(watchlist.value);
  if (!res) {
    return;
  }
  watchlist.value = res;
  moviesFiltered.value = res.movies_wishlists;
  showSuccess('Filme deletado da lista');
}
async function updateWatchlist(wishlist: WatchlistType) {
  try {
    showLoading();
    return await MovieWatchlistService.updateWatchlist(wishlist);
  } catch {
    showError('Erro ao salvar lista de filmes');
  } finally {
    hideLoading();
  }
}
function openDialogSummary(tmdbId: number) {
  console.log(tmdbId);
  if (!tmdbId) {
    return;
  }
  movieIdDialog.value = tmdbId;
  showDialogMovieSummary.value = true;
}
function copyMovieUrl(id: number) {
  if (!id) {
    return;
  }

  copyToClipboard(`${window.location.origin}/movie/discover?movie=${id}`)
    .then(() => showSuccess('URL copiada'))
    .catch(() => showError('Erro ao copiar URL'));
}
function dragStart(index: number) {
  draggedItemIndex.value = index;
}
function drop(index: number) {
  if (!moviesFiltered.value || !draggedItemIndex.value) {
    return;
  }

  const draggedItem = moviesFiltered.value[draggedItemIndex.value];
  moviesFiltered.value?.splice(draggedItemIndex.value, 1);
  moviesFiltered.value?.splice(index, 0, draggedItem);
  draggedItemIndex.value = null;
}
async function reorderWatchlistAndUpdate() {
  allowDrag.value = false;
  if (!watchlist.value) {
    return;
  }
  const res = await updateWatchlist(watchlist.value);
  if (!res) {
    return;
  }
  watchlist.value = res;
  moviesFiltered.value = res.movies_wishlists;
  showSuccess('Lista reordenada');
}
function moveSelection(step: number) {
  const newIndex = (selectedIndexMenu.value ?? -1) + step;
  const lenght = moviesWhenTyping.value?.length || 0;
  if (newIndex >= 0 && newIndex < lenght) {
    selectedIndexMenu.value = newIndex;
  }
  if (itensMenuRef.value?.length && selectedIndexMenu.value) {
    itensMenuRef.value[selectedIndexMenu.value]?.$el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}
function searchFromIndexMenu() {
  if (selectedIndexMenu.value === undefined || !moviesWhenTyping.value?.length) {
    firstSearch();
    return;
  }
  searchFromMenu(moviesWhenTyping.value[selectedIndexMenu.value].title);
}
function backToWatchlists() {
  router.push({ name: 'movie-watchlist-list' });
}
</script>
