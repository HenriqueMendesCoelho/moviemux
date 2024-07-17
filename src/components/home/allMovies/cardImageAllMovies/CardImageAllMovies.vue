<template>
  <router-link
    :to="{ name: 'movie', params: { id: movie?.id } }"
    class="col-10 justify-center"
    style="border-radius: 50px"
    @mouseover="showInfos = true"
    @mouseleave="showInfos = false"
  >
    <BaseCardImage :src="movie?.url_image" :key="movie?.id">
      <div class="absolute-bottom hover-show-img text-center desktop-only">
        {{ movie?.portuguese_title }}<br />
        {{ DateUtils.toLocaleDateStringLong(props.movie?.release_date) }}
      </div>
      <q-icon class="absolute all-pointer-events" size="32px" name="info" color="grey-4" style="top: 8px; left: 8px" v-if="!showChipNote()">
        <BaseTooltip :delay="500"> Esse filme ainda não tem notas </BaseTooltip>
      </q-icon>
      <BaseChipNote class="hover-show-img desktop-only" size="lg" :movie="movie" style="top: 8px; left: 8px" v-if="showChipNote()" dense />
    </BaseCardImage>
    <ContextMenuHome :movie-id="movie?.id || ''" />
  </router-link>
</template>

<script lang="ts" setup>
import { ref } from 'vue';

import Movie from 'src/domain/movie/movie';

import ContextMenuHome from '../../contextMenuHome/ContextMenuHome.vue';
import BaseTooltip from 'src/core/components/BaseTooltip.vue';
import BaseChipNote from 'src/core/components/BaseChipNote.vue';
import BaseCardImage from 'src/core/components/BaseCardImage.vue';

import DateUtils from 'src/core/utils/DateUtils';

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
