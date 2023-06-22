<template>
  <div class="row relative-position">
    <div class="row full-width q-my-md">
      <SearchToolbar
        :order-options="orderOptions"
        :input-search="searchText"
        @input-search="searchText = $event"
        :select-order="orderOption"
        @select-order="orderOption = $event"
        @refresh="refreshSearch()"
        @search="btnSearchAction()"
      />
    </div>
    <q-infinite-scroll ref="infinitScrollRef" class="full-width" @load="onLoad" :offset="10">
      <div class="row justify-center q-col-gutter-xl">
        <div class="col-auto" v-for="movie in movies" :key="movie.id">
          <CardImageAllMovies :movie="movie" />
        </div>
      </div>
    </q-infinite-scroll>
    <div class="row justify-center q-my-md" v-if="loading">
      <q-spinner color="kb-primary" size="50px" />
    </div>
    <FloatingActionButton />
  </div>
</template>
<script lang="ts" setup>
import { onMounted, ref } from 'vue';

import Movie from 'src/domain/movie/movie';

import CardImageAllMovies from './cardImageAllMovies/CardImageAllMovies.vue';
import MovieService from 'src/services/MovieService';
import FloatingActionButton from './floatingActionButton/FloatingActionButton.vue';
import SearchToolbar from 'src/components/shared/searchToolbar/SearchToolbar.vue';

const infinitScrollRef = ref<{
  resume: () => void;
}>();

const movies = ref<Movie[]>([]);
const loading = ref(false);
const pagesFouded = ref(2);
const page = ref(1);
const searchText = ref('');
const orderOption = ref<string | { label: string; value: string } | undefined>('');
const orderOptions = [
  { label: 'Título (A-Z)', value: 'portugueseTitle,asc' },
  { label: 'Título (Z-A)', value: 'portugueseTitle,desc' },
  {
    label: 'Data de Lançamento (Mais Novo)',
    value: 'releaseDate,portugueseTitle,desc',
  },
  {
    label: 'Data de Lançamento (Mais Antigo)',
    value: 'releaseDate,portugueseTitle,asc',
  },
  { label: 'Nota (Mais alta)', value: '&sortJoin=notes,desc' },
  { label: 'Nota (Mais baixa)', value: '&sortJoin=notes,asc' },
  {
    label: 'Data de Cadastro (Mais Novo)',
    value: 'createdAt,portugueseTitle,desc',
  },
  {
    label: 'Data de Cadastro (Mais Antigo)',
    value: 'createdAt,portugueseTitle,asc',
  },
  { label: 'Duração (Mais Longo)', value: 'runtime,desc' },
  { label: 'Duração (Mais Curto)', value: 'runtime,asc' },
];

onMounted(() => {
  loading.value = false;
  pagesFouded.value = 2;
  page.value = 1;
});

async function btnSearchAction(): Promise<void> {
  if (!searchText.value && !orderOption.value) {
    await refreshSearch();
    return Promise.resolve();
  }
  await search();
  return Promise.resolve();
}
async function search(pageParam = 1): Promise<void> {
  pagesFouded.value = 2;
  page.value = pageParam;
  const res = await searchMoviePageable();
  movies.value = res;
  loading.value = false;
  return Promise.resolve();
}
async function refreshSearch(): Promise<void> {
  orderOption.value = '';
  searchText.value = '';
  await search();
  infinitScrollRef.value?.resume();
  return Promise.resolve();
}
async function onLoad(index: number, done: (stop?: boolean) => void): Promise<void> {
  if (page.value > pagesFouded.value) {
    done(true);
    return;
  }
  const result = await searchMoviePageable();
  movies.value.push(...result);
  done();
  loading.value = false;
  return Promise.resolve();
}
async function searchMoviePageable(): Promise<Movie[]> {
  if (searchText.value) {
    const res = await MovieService.listMoviesByTitlePageable(page.value, searchText.value);
    pagesFouded.value = res.total_pages;
    page.value++;
    if (page.value >= pagesFouded.value) {
      loading.value = true;
    }

    return Promise.resolve(res.content);
  } else {
    const res = await MovieService.listMoviesPageable(
      page.value,
      30,
      typeof orderOption.value === 'object' ? orderOption.value.value : orderOption.value
    );
    pagesFouded.value = res.total_pages;
    page.value++;
    if (page.value >= pagesFouded.value) {
      loading.value = true;
    }
    return Promise.resolve(res.content);
  }
}
</script>
