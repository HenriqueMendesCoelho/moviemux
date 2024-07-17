<template>
  <BaseContainerMain>
    <div class="row full-width justify-center">
      <BasePageTitle title="Descobrir Filmes" icon="fa-solid fa-film" />
      <BaseHorizontalSeparator class="q-mb-xl" />
      <div class="scroll col-12">
        <BaseSearchToolbar
          v-model:input-search="searchText"
          v-model:select-order="selectOrder"
          :order-options="filterOptions"
          select-order-label="filtrar"
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
          :separeted-input-event="true"
        >
          <template #input-search>
            <q-menu class="bg-grey-mid text-white" fit no-focus no-refocus no-parent-event v-model="showMenu">
              <q-list dense dark>
                <q-item
                  ref="itensMenuRef"
                  active-class="text-kb-primary bg-grey-mid2"
                  v-for="(movie, index) in moviesWhenTyping"
                  :key="movie.id"
                  :active="selectedIndexMenu === index"
                  bordered
                  clickable
                >
                  <q-item-section @click="searchFromMenu(movie.title)" v-close-popup class="q-pl-sm">{{ movie.title }}</q-item-section>
                </q-item>
                <q-separator dark v-if="!!moviesWhenTyping ? moviesWhenTyping?.length > 1 : false" />
              </q-list>
            </q-menu>
          </template>
          <template #append>
            <q-separator class="q-mx-md" dark vertical inset />
            <q-select
              class="col-2"
              borderless
              :options="genresOptions"
              v-model="genresSelected"
              label="Gêneros"
              standout="text-kb-primary"
              color="kb-primary"
              dark
              popup-content-class="bg-grey-dark2"
              clearable
              option-label="name"
              option-value="tmdb_id"
              options-dense
              emit-value
              map-options
              multiple
              use-chips
              :loading="loadingGenres"
            >
              <template v-slot:selected-item="scope">
                <q-chip
                  removable
                  dense
                  @remove="scope.removeAtIndex(scope.index)"
                  :tabindex="scope.tabindex"
                  color="grey-dark2"
                  text-color="white"
                  class="q-ma-none"
                >
                  {{ scope.opt.name }}
                </q-chip>
              </template>
            </q-select>
          </template>
        </BaseSearchToolbar>
      </div>
      <div class="row justify-center q-mt-lg">
        <q-infinite-scroll ref="infinitScrollRef" class="full-width" @load="onLoad" :offset="10">
          <div class="row justify-center" :class="isDesktop ? 'q-col-gutter-xl' : 'q-col-gutter-xs'">
            <div class="col-auto" v-for="(movie, index) in movies" :key="index">
              <CardImageDiscoverMovies
                v-model="wishlists"
                :movie="movie"
                @call-tmdb="cardCallTmdb($event, movie.id)"
                @copy-url="copyMovie($event)"
              />
            </div>
          </div>
        </q-infinite-scroll>
        <div class="col-12 row justify-center q-my-md" v-if="loading">
          <q-spinner color="kb-primary" size="50px" />
        </div>
        <BaseFloatingActionBtn class="mobile-hide" />
      </div>
      <BaseDialogFormMovieSummary v-model="showDialogMovieSummary" :movie-id="movieIdDialog" position="standard" @hide="onHideDialog()">
        <template #prepend:bar>
          <q-btn round dense flat icon="playlist_add" color="white" size="md">
            <MenuAddMovieWishlist
              @add-movie="addMovieToWishlist($event, movieIdDialog)"
              :wishlists="wishlists"
              :movie="movieIdDialog"
              anchor="bottom middle"
              self="top middle"
            />
            <BaseTooltip anchor="center left" self="center end" :delay="400">Adicionar a uma lista</BaseTooltip>
          </q-btn>
        </template>
      </BaseDialogFormMovieSummary>
    </div>
  </BaseContainerMain>
</template>

<script lang="ts" setup>
import { computed, onActivated, onMounted, onUpdated, ref, watch, nextTick } from 'vue';
import { QItem, useQuasar } from 'quasar';
import { useRoute } from 'vue-router';
import { useRouter } from 'vue-router';

import { useStyleStore } from 'src/core/stores/StyleStore';

import type { MovieResultResponseTmdb } from 'src/core/types/movie/MovieType';
import type { WishlistType } from 'src/core/types/wishlist/WishlistType';

import BaseContainerMain from 'src/core/components/BaseContainerMain.vue';
import BaseSearchToolbar from 'src/core/components/BaseSearchToolbar.vue';
import BaseHorizontalSeparator from 'src/core/components/BaseHorizontalSeparator.vue';
import CardImageDiscoverMovies from './cardImageDiscoverMovies/CardImageDiscoverMovies.vue';
import BasePageTitle from 'src/core/components/BasePageTitle.vue';
import BaseDialogFormMovieSummary from 'src/core/components/BaseDialogFormMovieSummary.vue';
import BaseFloatingActionBtn from 'src/core/components/BaseFloatingActionBtn.vue';
import MenuAddMovieWishlist from './cardImageDiscoverMovies/menuAddMovieWishlist/MenuAddMovieWishlist.vue';
import BaseTooltip from 'src/core/components/BaseTooltip.vue';

import WishlistService from 'src/services/WishlistService';
import KitService from 'src/services/KitService';
import MovieService from 'src/services/MovieService';
import { showError, showSuccess } from 'src/utils/NotificationUtils';
import { hideLoading, showLoading } from 'src/utils/LoadingUtils';

const $q = useQuasar();
const isDesktop = $q.platform.is.desktop;
const route = useRoute();
const router = useRouter();

const searchText = ref('');
const filterOptions = ref([
  { label: 'Popularares', value: 'popular' },
  { label: 'Agora nos cinemas', value: 'playingNow' },
  { label: 'Avaliação (Maior)', value: 'topRated' },
  { label: 'Avaliação (Menor)', value: 'voteAverageAsc' },
  { label: 'Em breve nos cinemas', value: 'upcoming', badgeLabel: 'novo' },
]);
const infinitScrollRef = ref<{
  resume: () => void;
}>();
const selectOrder = ref<string | undefined | { label: string; value: string }>('');
const movies = ref<MovieResultResponseTmdb['results']>();
const moviesWhenTyping = ref<MovieResultResponseTmdb['results']>();
const page = ref(1);
const lastPage = ref(2);
const loading = ref(false);
const errorRequest = ref(false);
const movieIdSelected = ref(0);
const movieIdDialog = ref(0);
const showDialogMovieSummary = ref(false);
const menuIsFocused = ref(false);
const wishlists = ref<WishlistType[]>([]);
const genresOptions = ref<{ id: number; name: string; tmdb_id: number }[]>();
const genresSelected = ref<{ id: number; name: string; tmdb_id: number }[]>();
const loadingGenres = ref(false);
const showMenu = computed<boolean>(() => {
  return !!searchText.value && menuIsFocused.value && !!moviesWhenTyping.value?.length;
});
const styleStore = useStyleStore();
const scrollToTop = () => styleStore.scrollToContainer(0, 0, 'smooth');
const selectedIndexMenu = ref<number | undefined>(undefined);
const itensMenuRef = ref<InstanceType<typeof QItem>[]>();

onMounted(async () => {
  await firstSearch();
  await listWishlist();
  await loadGenres();
  showDialogByParam();
});

onActivated(async () => {
  await listWishlist();
});

onUpdated(async () => {
  await listWishlist();
  showDialogByParam();
});

watch(
  () => searchText.value,
  async (val: string) => {
    moviesWhenTyping.value = await getMoviesByName({ query: val });
  }
);

watch(
  () => genresSelected.value,
  () => {
    selectOrder.value = undefined;
    searchText.value = '';
    firstSearch();
  },
  { deep: true }
);

function onHideDialog() {
  router.push('/movie/discover');
}
function showDialogByParam() {
  const movieParam = parseInt(route.query.movie?.toString() || '');

  if (!movieParam) {
    return;
  }

  showDialog(movieParam);
}
async function cardCallTmdb(typeSearch: { label: string; value: string }, movieId: number) {
  movieIdSelected.value = movieId;
  selectOrder.value = typeSearch;
  page.value = 1;
  const result = await callTmdb();
  movies.value = result;
}

async function firstSearch() {
  try {
    page.value = 1;
    const result = await callTmdb();
    movies.value = result;
    nextTick(() => {
      infinitScrollRef.value?.resume();
    });
  } catch {
    showError('Não foi possível realizar a consulta');
    errorRequest.value = true;
  }
}
async function resetSearch() {
  try {
    searchText.value = '';
    selectOrder.value = '';
    genresSelected.value = [];
    page.value = 1;
    lastPage.value = 2;
    infinitScrollRef.value?.resume();
    errorRequest.value = false;
    const result = await callTmdb();
    movies.value = result;
  } catch {
    showError('Não foi possível realizar a consulta');
    errorRequest.value = true;
  }
}
async function onLoad(index: number, done: (stop?: boolean) => void) {
  if (errorRequest.value) {
    done(true);
  }
  if (loading.value) {
    return;
  }

  if (page.value > lastPage.value && page.value <= 500) {
    done(true);
    return;
  }

  loading.value = true;
  try {
    const result = await callTmdb();
    if (result?.length) {
      movies.value?.push(...result);
    }
    done();
  } catch {
    showError('Não foi possível realizar a consulta');
    errorRequest.value = true;
  } finally {
    loading.value = false;
  }
}
async function callTmdb() {
  if (page.value === 1) {
    scrollToTop();
  }

  if (typeof selectOrder?.value === 'object') {
    switch (selectOrder.value?.value) {
      case 'similar':
        return await getMoviesSimilar();
      case 'recommendation':
        return await getMoviesRecommendations();
      default:
        return await getMoviesPopular();
    }
  }

  if (searchText.value) {
    return await getMoviesByName({ query: searchText.value, page: page.value });
  }

  if (genresSelected.value?.length) {
    return await getMoviesDiscover({ with_genres: genresSelected.value.join(',') });
  }

  switch (selectOrder.value) {
    case 'playingNow':
      return await getMoviesNowPlaying();
    case 'topRated':
      return await getMoviesTopRated();
    case 'voteAverageAsc':
      return await getMoviesDiscover({ sort: 'vote_average.asc' });
    case 'upcoming':
      return await getMoviesUpcoming();
    default:
      return await getMoviesPopular();
  }
}
async function getMoviesPopular() {
  const res = await KitService.getMoviesPopular(page.value);
  lastPage.value = res.total_pages;
  page.value += 1;
  return res.results;
}
async function getMoviesNowPlaying() {
  const res = await KitService.getMoviesNowPlaying(page.value);
  lastPage.value = res.total_pages;
  page.value += 1;
  return res.results;
}
async function getMoviesUpcoming() {
  const res = await KitService.getMoviesUpcoming(page.value);
  lastPage.value = res.total_pages;
  page.value += 1;
  return res.results;
}
async function getMoviesTopRated() {
  const res = await KitService.getMoviesTopRated(page.value);
  lastPage.value = res.total_pages;
  page.value += 1;
  return res.results;
}
async function getMoviesDiscover({ sort, year, with_genres }: { sort?: string; year?: number; with_genres?: string }) {
  const res = await KitService.getMoviesDiscover(sort, page.value, year, with_genres);
  lastPage.value = res.total_pages;
  page.value += 1;
  return res.results;
}
async function getMoviesByName(payload: { query: string; page?: 1 | number; language?: 'pt-Br' }) {
  const res = await KitService.searchByName(payload);
  lastPage.value = res.total_pages;
  page.value += 1;
  return res.results;
}
async function getMoviesSimilar() {
  const res = await KitService.getMoviesSimilar(movieIdSelected.value, page.value);
  lastPage.value = res.total_pages;
  page.value += 1;
  return res.results;
}
async function getMoviesRecommendations() {
  const res = await KitService.getMoviesRecommendations(movieIdSelected.value, page.value);
  lastPage.value = res.total_pages;
  page.value += 1;
  return res.results;
}
function showDialog(movieId: number) {
  showDialogMovieSummary.value = true;
  movieIdDialog.value = movieId;
}
function copyMovie(id?: number) {
  if (!id) {
    return;
  }

  const url = `${window.location.origin}/movie/discover?movie=${id}`;
  navigator.clipboard.writeText(url);
  showSuccess('URL copiada');
  return url ? url : '';
}
async function searchFromMenu(title: string) {
  searchText.value = title;
  selectOrder.value = undefined;
  await firstSearch();
}
async function listWishlist() {
  const res = await WishlistService.listWishlists();
  wishlists.value = res;
}
async function addMovieToWishlist(wishlistId: string, tmdbId: number) {
  try {
    showLoading();
    const res = await WishlistService.addMovieToWishlist(wishlistId, tmdbId);
    mergeResult(wishlistId, res);
    showSuccess('Filme adicionado a lista com sucesso');
  } catch (error) {
    showError('Erro ao adicionar filme na lista');
  } finally {
    hideLoading();
  }
}
function mergeResult(wishlistId: string, newWishlist: WishlistType) {
  const wishlist = wishlists.value.find((w) => w.id === wishlistId);

  if (!wishlist) {
    return;
  }

  const index = wishlists.value.indexOf(wishlist);
  wishlists.value[index] = newWishlist;
}
async function loadGenres(): Promise<void> {
  try {
    loadingGenres.value = true;
    genresOptions.value = await MovieService.getMoviesGenres();
  } catch {
    showError('Erro ao carregar gêneros');
  } finally {
    loadingGenres.value = false;
  }
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
</script>
