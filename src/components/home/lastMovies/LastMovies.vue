<template>
  <div class="div-lastfilms q-pa-md" v-if="movies?.length">
    <div class="div-title">
      <q-btn
        :class="`icon-animate ${!isVisibleLastFilms && 'last-films-toggle'}`"
        icon="expand_less"
        color="white"
        round
        flat
        @click="isVisibleLastFilms = !isVisibleLastFilms"
      />
      <div class="text-title-responsive-2">Últimos Filmes</div>
      <div style="flex: 1 1 0"></div>
      <q-btn icon="refresh" color="white" round flat @click="loadLastMovies()" :loading="loading" />
    </div>
    <div class="row justify-center q-mt-md">
      <q-slide-transition>
        <div class="col-auto row no-wrap scroll q-col-gutter-lg justify-center-md q-px-xs" v-show="isVisibleLastFilms">
          <div v-for="movie of movies" :key="movie.id">
            <CardImageMovie class="col-auto" :id="movie.id" :title="movie.portuguese_title" :url="movie.url_image" :footer="true" />
          </div>
        </div>
      </q-slide-transition>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onActivated, onMounted, ref, watch } from 'vue';
import { useQuasar, Cookies } from 'quasar';

import Movie from 'src/domain/movie/movie';
import MovieService from 'src/services/MovieService';
import { socketAllMovies, stateSocketAllMovies } from 'src/boot/socket';

import CardImageMovie from './cardImageLastMovies/CardImageLastMovies.vue';

const $q = useQuasar();
const isDesktop = $q.platform.is.desktop;

const isVisibleLastFilms = ref(true);
const movies = ref<Movie[]>([]);
const loading = ref(false);

onMounted(async () => {
  await loadLastMovies();

  if (!stateSocketAllMovies.connected) {
    stateSocketAllMovies.token = Cookies.get('auth-kb');
    socketAllMovies.connect();
  }
});

onActivated(async () => {
  if (stateSocketAllMovies.connected && stateSocketAllMovies.hasToExecuteUpdate) {
    await loadLastMoviesOnSocketEvent();
  }
});

watch(
  () => stateSocketAllMovies.updateEvents,
  async () => {
    await loadLastMoviesOnSocketEvent();
  },
  { deep: true }
);

function showError(msg: string) {
  $q.notify({
    type: 'negative',
    message: msg,
    position: 'top',
  });
}

async function loadLastMovies() {
  try {
    loading.value = true;
  } catch (error) {
    showError('Erro ao executar, tente novamente mais tarde.');
  } finally {
    loading.value = false;
  }
  const res = await MovieService.listMoviesPageable({ page: 1, size: isDesktop ? 10 : 3, sort: 'createdAt,desc' });
  console.log(res);
  movies.value = res.content;
}
async function loadLastMoviesOnSocketEvent() {
  await loadLastMovies();
  stateSocketAllMovies.hasToExecuteUpdate = false;
}
</script>

<style lang="scss" scoped>
.div-lastfilms {
  transition: 0.2s ease-out;

  max-height: 480px;

  color: var(--light-grey2);
  border-radius: 10px;
  background-color: var(--grey-mid);
  box-shadow: 0 5px 30px var(--shadow);

  .last-films-toggle {
    transform: rotate(-180deg);
  }

  .div-title {
    display: flex;
    justify-content: flex-start;
    align-items: center;

    max-width: 100%;

    border-radius: 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);

    .icon-animate {
      transition: 0.2s ease-out;

      &:hover {
        color: var(--primary);
      }
    }
  }
}
</style>
