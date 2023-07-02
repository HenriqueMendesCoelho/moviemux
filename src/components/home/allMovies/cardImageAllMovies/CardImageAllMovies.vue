<template>
  <router-link
    :to="{ name: 'movie', params: { id: movie?.id } }"
    class="col-10 justify-center"
    style="border-radius: 50px"
    @mouseover="showInfos = true"
    @mouseleave="showInfos = false"
  >
    <CardImage :src="movie?.url_image" :key="movie?.id">
      <div class="absolute-bottom hover-show-img">
        {{ movie?.portuguese_title }}<br />
        {{ getMovieDateLocale() }}
      </div>
      <q-icon class="absolute all-pointer-events" size="32px" name="info" color="grey-4" style="top: 8px; left: 8px" v-if="!isRating()">
        <CustomTooltip :delay="500"> Esse filme ainda não tem notas </CustomTooltip>
      </q-icon>
      <ChipNote class="hover-show-img" size="lg" :movie="movie" style="top: 8px; left: 8px" v-if="isRating()" dense />
    </CardImage>
    <ContextMenuHome :movie-id="movie?.id || ''" />
  </router-link>
</template>

<script lang="ts" setup>
import { ref } from 'vue';

import Movie from 'src/domain/movie/movie';

import ContextMenuHome from '../../contextMenuHome/ContextMenuHome.vue';
import CustomTooltip from 'src/components/shared/customTooltip/CustomTooltip.vue';
import ChipNote from 'src/components/shared/chipNote/ChipNote.vue';
import CardImage from 'src/components/shared/cardImage/CardImage.vue';

interface Props {
  movie: Movie;
}

const props = defineProps<Props>();
const showInfos = ref(false);

function isRating() {
  return props.movie?.notes?.length;
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
</script>
<style lang="scss" scoped></style>
