<template>
  <ContainerMain>
    <div class="row full-width justify-center">
      <PageTitle title="Descobrir Filmes" icon="fa-solid fa-film" />
      <SeparatorDivLineSolid class="q-mb-xl" />
      <SearchToolbar
        class="col-12"
        :order-options="filterOptions"
        :input-search="searchText"
        @input-search="searchText = $event"
        :select-order="selectOrder"
        @select-order="selectOrder = $event"
        select-order-label="filtrar"
        @search="firstSearch()"
        @refresh="resetSearch()"
      />

      <div class="row justify-center q-mt-lg relative-position">
        <q-infinite-scroll ref="infinitScrollRef" class="full-width" @load="onLoad" :offset="1500">
          <div class="row justify-center q-col-gutter-xl">
            <div class="col-auto" v-for="(movie, index) in movies" :key="index">
              <CardImageDiscoverMovies @click-on-image="showDialog(movie.id)" :movie="movie" @call-tmdb="cardCallTmdb($event, movie.id)" />
            </div>
          </div>
        </q-infinite-scroll>
        <div class="col-12 row justify-center q-my-md" v-if="loading">
          <q-spinner color="kb-primary" size="50px" />
        </div>
        <FloatingActionBtnTop />
      </div>
      <DialogFormMovieSummary v-model="showDialogMovieSummary" :movie-id="movieIdDialog" position="standard" />
    </div>
  </ContainerMain>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useQuasar } from 'quasar';

import { MovieResultResponseTmdb } from 'src/types/movie/MovieType';

import ContainerMain from '../shared/containerMain/ContainerMain.vue';
import SearchToolbar from '../shared/searchToolbar/SearchToolbar.vue';
import SeparatorDivLineSolid from '../shared/separator/SeparatorDivLineSolid.vue';
import CardImageDiscoverMovies from './cardImageDiscoverMovies/CardImageDiscoverMovies.vue';
import PageTitle from '../shared/pageTitle/PageTitle.vue';
import DialogFormMovieSummary from '../shared/formMovieSummary/dialogFormMovieSummary/DialogFormMovieSummary.vue';
import FloatingActionBtnTop from 'src/components/shared/floatingActionBtnTop/FloatingActionBtnTop.vue';

import KitService from 'src/services/KitService';

const $q = useQuasar();
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
const page = ref(1);
const lastPage = ref(2);
const loading = ref(false);
const movieIdSelected = ref(0);
const movieIdDialog = ref(0);
const showDialogMovieSummary = ref(false);

function showError(msg: string) {
  $q.notify({
    type: 'negative',
    message: msg,
    position: 'top',
  });
}

onMounted(async () => {
  page.value = 1;
  lastPage.value = 2;
  const res = await getMoviesPopular();
  movies.value = res;
});

async function cardCallTmdb(typeSearch: { label: string; value: string }, movieId: number) {
  movieIdSelected.value = movieId;
  selectOrder.value = typeSearch;
  page.value = 1;
  const result = await callTmdb();
  movies.value = result;
}

async function firstSearch() {
  page.value = 1;
  infinitScrollRef.value?.resume();
  const result = await callTmdb();
  movies.value = result;
}
async function resetSearch() {
  searchText.value = '';
  selectOrder.value = '';
  page.value = 1;
  lastPage.value = 2;
  infinitScrollRef.value?.resume();
  const result = await callTmdb();
  movies.value = result;
}
async function onLoad(index: number, done: (stop?: boolean) => void) {
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
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth',
    });
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

  switch (selectOrder.value) {
    case 'playingNow':
      return await getMoviesNowPlaying();
    case 'topRated':
      return await getMoviesTopRated();
    case 'voteAverageAsc':
      return await getMoviesDiscover('vote_average.asc');
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
async function getMoviesDiscover(sort?: string, year?: number, with_genres?: string) {
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
</script>

<script lang="ts">
import { defineComponent } from 'vue';
export default defineComponent({
  name: 'DiscoverMoviesPage',
  beforeRouteEnter() {
    document.title = 'Cineminha - Descobrir';
  },
});
</script>
