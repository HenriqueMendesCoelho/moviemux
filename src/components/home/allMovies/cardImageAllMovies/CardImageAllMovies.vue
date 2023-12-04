<template>
  <router-link
    :to="{ name: 'movie', params: { id: movie?.id } }"
    class="col-10 justify-center"
    style="border-radius: 50px"
    @mouseover="showInfos = true"
    @mouseleave="showInfos = false"
  >
    <CardImage :src="movie?.url_image" :key="movie?.id">
      <div class="absolute-bottom hover-show-img text-center">
        {{ movie?.portuguese_title }}<br />
        {{ DateUtils.toLocaleDateStringLong(props.movie?.release_date) }}
      </div>
      <q-icon class="absolute all-pointer-events" size="32px" name="info" color="grey-4" style="top: 8px; left: 8px" v-if="!showChipNote()">
        <CustomTooltip :delay="500"> Esse filme ainda não tem notas </CustomTooltip>
      </q-icon>
      <ChipNote class="hover-show-img" size="lg" :movie="movie" style="top: 8px; left: 8px" v-if="showChipNote()" dense />
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

import DateUtils from 'src/utils/DateUtils';

interface Props {
  movie: Movie;
}

const props = defineProps<Props>();
const showInfos = ref(false);

function showChipNote() {
  return props.movie?.notes?.length && props.movie?.show_notes;
}
</script>
<style lang="scss" scoped></style>
