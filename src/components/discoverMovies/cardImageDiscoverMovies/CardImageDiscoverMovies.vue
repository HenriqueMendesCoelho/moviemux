<template>
  <CardImage :class="`${selected && 'img-movie-selected'}`" :src="getUrl()" @click="emit('clickOnImage')">
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
      <q-menu class="bg-grey-dark2" dark @before-show="selected = true" @before-hide="selected = false" dense>
        <q-list dense>
          <q-item clickable v-close-popup @click="clickSimilar">
            <q-icon name="search" size="lg" />
            <q-item-section class="q-pl-sm">Ver filmes similares</q-item-section>
          </q-item>

          <q-item clickable v-close-popup @click="clickRecommendations">
            <q-icon name="search" size="lg" />
            <q-item-section class="q-pl-sm">Ver recomendações</q-item-section>
          </q-item>

          <q-item clickable v-if="false">
            <q-icon name="list" size="lg" />
            <q-icon name="add" size="xs" />
            <q-item-section class="q-pl-sm">Adicionar a minha lista</q-item-section>
            <q-item-section side>
              <q-icon name="keyboard_arrow_right" color="white" />
            </q-item-section>

            <q-menu anchor="top end" self="top start" class="bg-grey-dark2" dark>
              <q-list>
                <q-item v-for="list in lists" :key="list" dense clickable>
                  <q-item-section @click="addToList()" v-close-popup class="q-pl-sm">{{ list }}</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-item>
        </q-list>
      </q-menu>
    </q-btn>
  </CardImage>
</template>
<script setup lang="ts">
import { ref } from 'vue';

import { MovieResultResponseTmdb } from '@/types/movie/MovieType';
import CardImage from '@/components/shared/cardImage/CardImage.vue';

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
const lists = ref([]);

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
function addToList() {
  return;
}
</script>
<style lang="scss" scoped>
.img-movie-selected {
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
