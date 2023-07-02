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
        @input-search-focus="menuIsFocused = $event"
      >
        <template #input-search>
          <q-menu class="bg-grey-mid text-white" fit no-focus no-refocus no-parent-event v-model="showMenu">
            <q-list dense dark>
              <div v-for="movie in moviesSearchToolbar" :key="movie.id">
                <q-item bordered clickable v-close-popup>
                  <q-item-section v-close-popup class="q-pl-sm" @click="searchActionToolbar(movie.portuguese_title)">{{
                    movie.portuguese_title
                  }}</q-item-section>
                </q-item>
                <q-separator dark />
              </div>
            </q-list>
          </q-menu>
        </template>
      </SearchToolbar>
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
import { computed, onMounted, ref, watch } from 'vue';
import { useQuasar } from 'quasar';

import Movie from 'src/domain/movie/movie';

import CardImageAllMovies from './cardImageAllMovies/CardImageAllMovies.vue';
import MovieService from 'src/services/MovieService';
import FloatingActionButton from './floatingActionButton/FloatingActionButton.vue';
import SearchToolbar from 'src/components/shared/searchToolbar/SearchToolbar.vue';
import { MoviePageableType } from 'src/types/movie/MovieType';

const infinitScrollRef = ref<{
  resume: () => void;
}>();

const $q = useQuasar();

const movies = ref<Movie[]>([]);
const moviesSearchToolbar = ref<Movie[]>([]);
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

const menuIsFocused = ref(false);

const showMenu = computed<boolean>(() => {
  return !!searchText.value && menuIsFocused.value && !!moviesSearchToolbar.value?.length;
});

onMounted(() => {
  loading.value = false;
  pagesFouded.value = 2;
  page.value = 1;
});

watch(
  () => searchText.value,
  async (val: string) => {
    pagesFouded.value = 2;
    page.value = 1;
    moviesSearchToolbar.value = (await searchMoviesByTitle(val)).content;
  }
);

function showError(msg = 'Erro ao executar ação, tente novamente mais tarde') {
  $q.notify({
    type: 'negative',
    message: msg,
    position: 'top',
  });
}

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
}
async function refreshSearch(): Promise<void> {
  orderOption.value = '';
  searchText.value = '';
  await search();
  infinitScrollRef.value?.resume();
  return Promise.resolve();
}
async function onLoad(index: number, done: (stop?: boolean) => void): Promise<void> {
  if (page.value >= pagesFouded.value) {
    done(true);
    return;
  }
  const result = await searchMoviePageable();
  movies.value?.push(...result);
  done();
  loading.value = false;
  return Promise.resolve();
}
async function searchMoviePageable(): Promise<Movie[]> {
  if (searchText.value) {
    try {
      const res = await searchMoviesByTitle(searchText.value, page.value);
      pagesFouded.value = res.total_pages;
      page.value++;
      if (page.value >= pagesFouded.value) {
        loading.value = true;
      }

      return res.content;
    } catch (error) {
      showError();
      return [] as Movie[];
    }
  } else {
    try {
      const res = await searchMovies(typeof orderOption.value === 'object' ? orderOption.value.value : orderOption.value, page.value);
      pagesFouded.value = res?.total_pages;
      page.value++;
      if (page.value >= pagesFouded.value) {
        loading.value = true;
      }
      return res.content;
    } catch (error) {
      showError();
      return [] as Movie[];
    }
  }
}
async function searchMoviesByTitle(title: string, page = 1) {
  try {
    const res = await MovieService.listMoviesByTitlePageable(page, title);
    return res;
  } catch (error) {
    return Promise.reject(error);
  }
}
async function searchMovies(sort: string | undefined, page = 1, size = 30): Promise<MoviePageableType> {
  try {
    const res = await MovieService.listMoviesPageable(page, size, sort);
    return res;
  } catch (error) {
    return Promise.reject(error);
  }
}
async function searchActionToolbar(title?: string): Promise<void> {
  if (!title) {
    return;
  }
  searchText.value = title;
  await btnSearchAction();
}
</script>
