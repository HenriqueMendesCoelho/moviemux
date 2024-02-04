<template>
  <ContainerMain>
    <div class="row full-width justify-center">
      <PageTitle title="Descobrir Filmes" icon="fa-solid fa-film" />
      <SeparatorDivLineSolid class="q-mb-xl" />
      <div class="scroll col-12">
        <SearchToolbar
          :order-options="filterOptions"
          v-model:input-search="searchText"
          v-model:select-order="selectOrder"
          select-order-label="filtrar"
          @search="firstSearch()"
          @refresh="resetSearch()"
          @input-search-focus="menuIsFocused = $event"
        >
          <template #input-search>
            <q-menu class="bg-grey-mid text-white" fit no-focus no-refocus no-parent-event v-model="showMenu">
              <q-list dense dark>
                <q-item v-for="movie in moviesWhenTyping" :key="movie.id" bordered clickable>
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
        </SearchToolbar>
      </div>
      <div class="row justify-center q-mt-lg">
        <q-infinite-scroll ref="infinitScrollRef" class="full-width" @load="onLoad" :offset="1500">
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
        <FloatingActionBtnTop class="mobile-hide" />
      </div>
      <DialogFormMovieSummary v-model="showDialogMovieSummary" :movie-id="movieIdDialog" position="standard" @hide="onHideDialog()">
        <template #prepend:bar>
          <q-btn round dense flat icon="playlist_add" color="white" size="md">
            <MenuAddMovieWishlist
              @add-movie="addMovieToWishlist($event, movieIdDialog)"
              :wishlists="wishlists"
              :movie="movieIdDialog"
              anchor="bottom middle"
              self="top middle"
            />
            <CustomTooltip anchor="center left" self="center end" :delay="400">Adicionar a uma lista</CustomTooltip>
          </q-btn>
        </template>
      </DialogFormMovieSummary>
    </div>
  </ContainerMain>
</template>

<script lang="ts" setup>
import { computed, onActivated, onMounted, onUpdated, ref, watch, nextTick } from 'vue';
import { useQuasar } from 'quasar';
import { useRoute } from 'vue-router';
import { useRouter } from 'vue-router';

import { useStyleStore } from 'src/stores/StyleStore';

import { MovieResultResponseTmdb } from 'src/types/movie/MovieType';
import { WishlistType } from 'src/types/wishlist/WishlistType';

import ContainerMain from '../shared/containerMain/ContainerMain.vue';
import SearchToolbar from '../shared/searchToolbar/SearchToolbar.vue';
import SeparatorDivLineSolid from '../shared/separator/SeparatorDivLineSolid.vue';
import CardImageDiscoverMovies from './cardImageDiscoverMovies/CardImageDiscoverMovies.vue';
import PageTitle from '../shared/pageTitle/PageTitle.vue';
import DialogFormMovieSummary from '../shared/formMovieSummary/dialogFormMovieSummary/DialogFormMovieSummary.vue';
import FloatingActionBtnTop from 'src/components/shared/floatingActionBtnTop/FloatingActionBtnTop.vue';
import MenuAddMovieWishlist from './cardImageDiscoverMovies/menuAddMovieWishlist/MenuAddMovieWishlist.vue';
import CustomTooltip from 'src/components/shared/customTooltip/CustomTooltip.vue';

import WishlistService from 'src/services/WishlistService';
import KitService from 'src/services/KitService';
import MovieService from 'src/services/MovieService';

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
  page.value = 1;
  const result = await callTmdb();
  movies.value = result;
  nextTick(() => {
    infinitScrollRef.value?.resume();
  });
}
async function resetSearch() {
  searchText.value = '';
  selectOrder.value = '';
  genresSelected.value = [];
  page.value = 1;
  lastPage.value = 2;
  infinitScrollRef.value?.resume();
  const result = await callTmdb();
  movies.value = result;
}
async function onLoad(index: number, done: (stop?: boolean) => void) {
  if (loading.value) {
    return;
  }

  if (page.value > lastPage.value && page.value <= 500) {
    done(true);
    return;
  }

  loading.value = true;
  const result = await callTmdb();
  if (result?.length) {
    movies.value?.push(...result);
  }

  done();
  loading.value = false;
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
    default:
      return await getMoviesPopular();
  }
}
async function getMoviesPopular() {
  try {
    const res = await KitService.getMoviesPopular(page.value);
    lastPage.value = res.total_pages;
    page.value += 1;
    return res.results;
  } catch {
    showError('Não foi possível realizar a consulta');
  }
}
async function getMoviesNowPlaying() {
  try {
    const res = await KitService.getMoviesNowPlaying(page.value);
    lastPage.value = res.total_pages;
    page.value += 1;
    return res.results;
  } catch {
    showError('Não foi possível realizar a consulta');
  }
}
async function getMoviesTopRated() {
  try {
    const res = await KitService.getMoviesTopRated(page.value);
    lastPage.value = res.total_pages;
    page.value += 1;
    return res.results;
  } catch {
    showError('Não foi possível realizar a consulta');
  }
}
async function getMoviesDiscover({ sort, year, with_genres }: { sort?: string; year?: number; with_genres?: string }) {
  try {
    const res = await KitService.getMoviesDiscover(sort, page.value, year, with_genres);
    lastPage.value = res.total_pages;
    page.value += 1;
    return res.results;
  } catch {
    showError('Não foi possível realizar a consulta');
  }
}
async function getMoviesByName(payload: { query: string; page?: 1 | number; language?: 'pt-Br' }) {
  try {
    const res = await KitService.searchByName(payload);
    lastPage.value = res.total_pages;
    page.value += 1;
    return res.results;
  } catch {
    showError('Não foi possível realizar a consulta');
  }
}
async function getMoviesSimilar() {
  try {
    const res = await KitService.getMoviesSimilar(movieIdSelected.value, page.value);
    lastPage.value = res.total_pages;
    page.value += 1;
    return res.results;
  } catch {
    showError('Não foi possível realizar a consulta');
  }
}
async function getMoviesRecommendations() {
  try {
    const res = await KitService.getMoviesRecommendations(movieIdSelected.value, page.value);
    lastPage.value = res.total_pages;
    page.value += 1;
    return res.results;
  } catch {
    showError('Não foi possível realizar a consulta');
  }
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
</script>
