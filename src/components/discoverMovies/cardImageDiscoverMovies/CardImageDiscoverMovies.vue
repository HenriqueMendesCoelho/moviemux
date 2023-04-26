<template>
  <q-img
    class="img-movie"
    :class="`${selected && 'img-movie-selected'}`"
    :src="getUrl()"
    spinner-color="kb-primary"
    width="250px"
    height="380px"
    :no-native-menu="true"
    :draggable="false"
    @click="emit('clickOnImage')"
  >
    <div class="absolute-bottom hover-show-img text-center">
      {{ props.movie?.title }}<br />
      {{ getMovieDateLocale() }}
    </div>
    <q-btn
      class="absolute all-pointer-events cursor-pointer"
      icon="more_horiz"
      color="grey-mid2"
      style="top: 8px; right: 8px"
      size="sm"
      dark
      round
      @click.stop
    >
      <q-popup-proxy class="bg-grey-dark2" dark @before-show="selected = true" @before-hide="selected = false">
        <q-list>
          <q-item clickable v-close-popup v-if="false">
            <q-icon name="list" size="lg" />
            <q-icon name="add" size="xs" />
            <q-item-section class="q-pl-sm">Adicionar a minha lista</q-item-section>
          </q-item>
          <q-item clickable v-close-popup @click="clickSimilar">
            <q-icon name="search" size="lg" />
            <q-item-section class="q-pl-sm">Ver filmes similares</q-item-section>
          </q-item>
          <q-item clickable v-close-popup @click="clickRecommendations">
            <q-icon name="search" size="lg" />
            <q-item-section class="q-pl-sm">Ver recomendações</q-item-section>
          </q-item>
        </q-list>
      </q-popup-proxy>
    </q-btn>
    <template v-slot:error>
      <div class="absolute-full flex flex-center bg-grey-mid text-white">
        <div class="row justify-center">
          <q-icon class="col-12 q-mb-md" name="error" size="lg" />
          <p>Erro ao carregar imagem</p>
        </div>
      </div>
    </template>
  </q-img>
</template>
<script setup lang="ts">
import { ref } from 'vue';

import { MovieResultResponseTmdb } from '@/types/movie/MovieType';

type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType extends readonly (infer ElementType)[] ? ElementType : never;
interface Props {
  movie: ArrayElement<MovieResultResponseTmdb['results']>;
}

const emit = defineEmits<{
  (e: 'callTmdb', value: { label: string; value: string }): void;
  (e: 'clickOnImage', value: void): void;
}>();

const props = defineProps<Props>();
const selected = ref(false);

function getUrl() {
  return `https://image.tmdb.org/t/p/w500${props.movie?.poster_path}`;
}

function getMovieDateLocale() {
  if (!props.movie?.release_date) {
    return;
  }
  const date = new Date(props.movie.release_date);
  return date.toLocaleString('pt-Br', {
    dateStyle: 'long',
  });
}
function clickRecommendations() {
  emit('callTmdb', { label: `Recomendações para ${props.movie.title}`, value: 'recommendation' });
}
function clickSimilar() {
  emit('callTmdb', { label: `Similares a ${props.movie.title}`, value: 'similar' });
}
</script>
<style lang="scss">
.img-movie {
  border-radius: 10px;
  transition: 0.2s ease-out;

  cursor: pointer;

  .hover-show-img {
    opacity: 0;
  }

  &:hover {
    transform: scale(1.1);
    .hover-show-img {
      opacity: 1;
      transition: opacity 0.3s ease-out;
    }
  }
}

.img-movie.img-movie-selected {
  opacity: 0.7;
  filter: blur(2px);
  &:hover {
    transform: scale(1);

    .hover-show-img {
      opacity: 0;
      transition: opacity 0.3s ease-out;
    }
  }
}
</style>
