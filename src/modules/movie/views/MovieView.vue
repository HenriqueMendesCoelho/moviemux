<template>
  <BaseContainerMain>
    <div>
      <MovieSuperiorButtons :show-edit-btn="showEditBtn()" show-refresh-btn />
      <BaseHorizontalSeparator />
    </div>
    <div class="text-white">
      <MovieForm ref="formMovieRef" readonly />
      <MovieTableNotes :movie-id="movieId" />
      <MovieVideoEmbedded :width="isMobile ? '100%' : '560px'" />
    </div>
  </BaseContainerMain>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMeta, useQuasar } from 'quasar';

import BaseContainerMain from 'src/core/components/BaseContainerMain.vue';
import BaseHorizontalSeparator from 'src/core/components/BaseHorizontalSeparator.vue';

import MovieSuperiorButtons from '../components/MovieSuperiorButtons.vue';
import MovieForm from '../components/MovieForm.vue';
import MovieTableNotes from '../components/MovieTableNotes.vue';
import MovieVideoEmbedded from '../components/MovieVideoEmbedded.vue';

import { useMovieStore } from '../stores/MovieStore';
import { useUserStore } from 'src/core/stores/UserStore';

import MovieService from '../services/MovieService';
import { showError } from 'src/core/utils/NotificationUtils';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const user = computed(() => useUserStore().user);

const isMobile = $q.platform.is.mobile;
const movieId = ref(route.params.id?.toString());
const moviePage = computed(() => useMovieStore().moviePage);

onMounted(async () => {
  if (movieId.value === moviePage.value.selectedMovie.id) {
    return;
  }
  await loadMovie();
});

async function loadMovie() {
  if (!movieId.value) {
    return;
  }
  try {
    const res = await MovieService.getMovie(movieId.value);
    moviePage.value.selectedMovie = res;
    setDocumentTitle();
  } catch {
    showError('Erro ao buscar filme. Tente novamente mais tarde.');
    router.push('/home');
  }
}
function setDocumentTitle() {
  useMeta({
    title: `Movie Mux - ${moviePage.value.selectedMovie.portuguese_title}`,
  });
}

function showEditBtn() {
  return useUserStore().isAdmin || user.value.id === moviePage.value.selectedMovie.user_id;
}
</script>
