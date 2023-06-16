<template>
  <div class="row" style="position: relative">
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
<script lang="ts">
import { defineComponent, ref } from 'vue';

import Movie from '@/domain/movie/movie';

import CardImageAllMovies from './cardImageAllMovies/CardImageAllMovies.vue';
import MovieService from '@/services/MovieService';
import FloatingActionButton from './floatingActionButton/FloatingActionButton.vue';
import SearchToolbar from '@/components/shared/searchToolbar/SearchToolbar.vue';

export default defineComponent({
  name: 'AllMovies',
  components: { CardImageAllMovies, FloatingActionButton, SearchToolbar },
  setup() {
    const infinitScrollRef = ref<{
      resume: () => void;
    }>();
    return {
      infinitScrollRef,
    };
  },
  data() {
    return {
      movies: [] as Movie[],
      loading: false,
      pagesFouded: 2,
      page: 1,
      searchText: '',
      orderOption: '' as string | { label: string; value: string } | undefined,
      orderOptions: [
        { label: 'Título (A-Z)', value: 'portugueseTitle,asc' },
        { label: 'Título (Z-A)', value: 'portugueseTitle,desc' },
        { label: 'Data de Lançamento (Mais Novo)', value: 'releaseDate,portugueseTitle,desc' },
        { label: 'Data de Lançamento (Mais Antigo)', value: 'releaseDate,portugueseTitle,asc' },
        { label: 'Nota (Mais alta)', value: '&sortJoin=notes,desc' },
        { label: 'Nota (Mais baixa)', value: '&sortJoin=notes,asc' },
        { label: 'Data de Cadastro (Mais Novo)', value: 'createdAt,portugueseTitle,desc' },
        { label: 'Data de Cadastro (Mais Antigo)', value: 'createdAt,portugueseTitle,asc' },
        { label: 'Duração (Mais Longo)', value: 'runtime,desc' },
        { label: 'Duração (Mais Curto)', value: 'runtime,asc' },
      ],
    };
  },
  mounted() {
    this.loading = false;
    this.pagesFouded = 2;
    this.page = 1;
  },
  methods: {
    async btnSearchAction(): Promise<void> {
      if (!this.searchText && !this.orderOption) {
        await this.refreshSearch();
        return Promise.resolve();
      }
      await this.search();
      return Promise.resolve();
    },
    async search(pageParam = 1): Promise<void> {
      this.pagesFouded = 2;
      this.page = pageParam;
      const res = await this.searchMoviePageable();
      this.movies = res;
      this.loading = false;
      return Promise.resolve();
    },
    async refreshSearch(): Promise<void> {
      this.orderOption = '';
      this.searchText = '';
      await this.search();
      this.infinitScrollRef?.resume();
      return Promise.resolve();
    },
    async onLoad(index: number, done: (stop?: boolean) => void): Promise<void> {
      if (this.page > this.pagesFouded) {
        done(true);
        return;
      }
      const result = await this.searchMoviePageable();
      this.movies.push(...result);
      done();
      this.loading = false;
      return Promise.resolve();
    },
    async searchMoviePageable(): Promise<Movie[]> {
      if (this.searchText) {
        const res = await MovieService.listMoviesByTitlePageable(this.page, this.searchText);
        this.pagesFouded = res.total_pages;
        this.page++;
        if (this.page >= this.pagesFouded) {
          this.loading = true;
        }

        return Promise.resolve(res.content);
      } else {
        const res = await MovieService.listMoviesPageable(
          this.page,
          30,
          typeof this.orderOption === 'object' ? this.orderOption.value : this.orderOption
        );
        this.pagesFouded = res.total_pages;
        this.page++;
        if (this.page >= this.pagesFouded) {
          this.loading = true;
        }
        return Promise.resolve(res.content);
      }
    },
  },
});
</script>
