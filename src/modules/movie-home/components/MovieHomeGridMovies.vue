<template>
  <div class="row relative-position">
    <div class="row full-width q-my-md scroll">
      <BaseSearchToolbar
        :order-options="orderOptions"
        v-model:input-search="searchText"
        v-model:select-order="orderOption"
        @refresh="refreshSearch()"
        @search="btnSearchAction()"
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
        <template #prepend>
          <div>
            <q-icon name="menu" size="sm" />
            <BaseTooltip :delay="1200"
              >Total de filmes cadastrados: <strong>{{ totalNumberOfMovies }}</strong></BaseTooltip
            >
          </div>
        </template>
        <template #input-search>
          <q-menu
            class="bg-grey-mid text-white"
            fit
            no-focus
            no-refocus
            no-parent-event
            v-model="showMenu"
          >
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
                <q-item-section
                  @click="searchActionToolbar(movie.portuguese_title)"
                  v-close-popup
                  class="q-pl-sm"
                  >{{ movie.portuguese_title }}</q-item-section
                >
              </q-item>
              <q-separator dark v-if="moviesWhenTyping?.length > 1" />
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
            option-value="id"
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
    <q-infinite-scroll ref="infinitScrollRef" class="full-width" @load="onLoad" :offset="10">
      <div class="row justify-center" :class="isDesktop ? 'q-col-gutter-xl' : 'q-col-gutter-xs'">
        <div class="col-auto" v-for="(movie, index) in movies" :key="index">
          <MovieHomeCardImageGrid :movie="movie" />
        </div>
      </div>
    </q-infinite-scroll>
    <div class="col-12 row justify-center q-my-md" v-if="loading">
      <q-spinner color="kb-primary" size="50px" />
    </div>
    <MovieHomeFloatingActionButton />
  </div>
</template>
<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { QInfiniteScroll, QItem, useQuasar } from 'quasar';

import type { MoviePageableType } from 'src/core/types/movie/MovieType';

import type Movie from 'src/core/domain/movie/movie';

import MovieHomeCardImageGrid from './MovieHomeCardImageGrid.vue';
import MovieService from 'src/modules/movie/services/MovieService';
import MovieHomeFloatingActionButton from './MovieHomeFloatingActionButton.vue';
import BaseSearchToolbar from 'src/core/components/BaseSearchToolbar.vue';
import BaseTooltip from 'src/core/components/BaseTooltip.vue';

import { showError } from 'src/core/utils/NotificationUtils';

const infinitScrollRef = ref<InstanceType<typeof QInfiniteScroll>>();

const $q = useQuasar();
const isDesktop = $q.platform.is.desktop;

const movies = ref<Movie[]>([]);
const moviesWhenTyping = ref<Movie[]>([]);
const totalNumberOfMovies = ref(0);
const loading = ref(false);
const errorRequest = ref(false);
const pagesFouded = ref(2);
const page = ref(1);
const searchText = ref('');
const genresOptions = ref<{ id: number; name: string; tmdb_id: number }[]>();
const genresSelected = ref<{ id: number; name: string; tmdb_id: number }[]>();
const loadingGenres = ref(false);
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
  { label: 'Nota (Mais alta)', value: 'portugueseTitle,asc&sortJoin=notes,desc' },
  { label: 'Nota (Mais baixa)', value: 'portugueseTitle,asc&sortJoin=notes,asc' },
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
  return !!searchText.value && menuIsFocused.value && !!moviesWhenTyping.value?.length;
});
const selectedIndexMenu = ref<number | undefined>(undefined);
const itensMenuRef = ref<InstanceType<typeof QItem>[]>();

onMounted(async () => {
  loading.value = false;
  pagesFouded.value = 2;
  page.value = 1;
  await loadGenres();
});

watch(
  () => searchText.value,
  async (val: string) => {
    pagesFouded.value = 2;
    page.value = 1;
    moviesWhenTyping.value = (await searchMovies({ title: val })).content;
  },
);

watch(
  () => genresSelected.value,
  async () => {
    await search();
  },
  { deep: true },
);

async function btnSearchAction(): Promise<void> {
  if (!searchText.value && !orderOption.value && !genresSelected.value) {
    await refreshSearch();
  }
  await search();
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
  genresSelected.value = [];
  await search();
  infinitScrollRef.value?.resume();
}
async function onLoad(index: number, done: (stop?: boolean) => void): Promise<void> {
  if (errorRequest.value) {
    done(true);
  }
  if (loading.value) {
    return;
  }
  if (page.value > pagesFouded.value) {
    done(true);
    loading.value = false;
    return;
  }

  loading.value = true;
  const result = await searchMoviePageable();
  if (result?.length) {
    movies.value?.push(...result);
  }
  done();
  loading.value = false;
}
async function searchMoviePageable(): Promise<Movie[]> {
  try {
    const sortParam = () => {
      if (!orderOption.value) {
        return undefined;
      }
      if (typeof orderOption.value === 'object') {
        return orderOption.value?.value;
      }

      return orderOption.value;
    };
    const res = await searchMovies({
      title: searchText.value,
      sort: sortParam(),
      page: page.value,
      withGenres: genresSelected.value?.join(','),
    });
    pagesFouded.value = res?.total_pages;
    page.value++;
    totalNumberOfMovies.value = res.total_elements;
    return res.content;
  } catch {
    showError('Falha ao realizar a busca dos filmes. Tente novamente mais tarde.');
    return [] as Movie[];
  }
}
async function searchMovies({
  title,
  sort,
  page = 1,
  size = 30,
  withGenres,
}: {
  title?: string | undefined;
  sort?: string | undefined;
  page?: number | undefined;
  size?: number | undefined;
  withGenres?: string;
}): Promise<MoviePageableType> {
  try {
    const res = await MovieService.listMoviesPageable({ title, page, size, sort, withGenres });
    return res;
  } catch (error) {
    errorRequest.value = true;
    throw error;
  }
}
async function searchActionToolbar(title?: string): Promise<void> {
  if (!title) {
    return;
  }
  searchText.value = title;
  await btnSearchAction();
}
async function loadGenres(): Promise<void> {
  try {
    loadingGenres.value = true;
    genresOptions.value = await MovieService.getMoviesGenresWithMovies();
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
    itensMenuRef.value[selectedIndexMenu.value]?.$el.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  }
}
async function searchFromIndexMenu() {
  if (selectedIndexMenu.value === undefined || !moviesWhenTyping.value?.length) {
    await btnSearchAction();
    return;
  }
  const indexSelected = selectedIndexMenu.value ?? -1;
  const validIndex = indexSelected >= 0 && indexSelected < moviesWhenTyping.value.length;
  if (!validIndex) {
    await btnSearchAction();
    return;
  }
  const movieSelected = moviesWhenTyping.value[selectedIndexMenu.value];
  if (!movieSelected) {
    await btnSearchAction();
    return;
  }
  await searchActionToolbar(movieSelected.portuguese_title);
}
</script>
