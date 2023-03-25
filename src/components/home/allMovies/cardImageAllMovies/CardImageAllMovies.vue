<template>
  <div class="row full-width justify-center">
    <div
      class="col-10 container-img justify-center"
      style="border-radius: 50px"
      @mouseover="showInfos = true"
      @mouseleave="showInfos = false"
    >
      <q-img
        class="image-cls"
        :src="movie?.url_image"
        spinner-color="kb-primary"
        :key="movie?.id"
        @click="pushToMovie(movie?.id)"
        height="320px"
        no-native-menu
        :draggable="false"
      >
        <transition>
          <div class="absolute-bottom" v-if="showInfos">{{ movie?.portuguese_title }}</div>
        </transition>
        <transition>
          <q-icon
            class="absolute all-pointer-events"
            size="32px"
            name="info"
            color="grey-4"
            style="top: 8px; left: 8px"
            v-if="showInfos && !isRating()"
          >
            <CustomTooltip :delay="500"> Esse filme ainda não tem notas </CustomTooltip>
          </q-icon>
        </transition>
        <transition>
          <q-chip
            dense
            size="lg"
            square
            :color="getChipColor()[0]"
            text-color="white"
            :icon-right="getChipColor()[1]"
            style="top: 8px; left: 8px"
            v-if="showInfos && isRating()"
          >
            {{ getNoteAverage() }}
          </q-chip>
        </transition>
      </q-img>
      <ContextMenuHome :movie-id="movie?.id || ''" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';

import Movie from '@/domain/movie/movie';

import ContextMenuHome from '../../contextMenuHome/ContextMenuHome.vue';
import CustomTooltip from '@/components/shared/customTooltip/CustomTooltip.vue';

export default defineComponent({
  name: 'CardImageAllMovies',
  components: { ContextMenuHome, CustomTooltip },
  props: {
    movie: {
      type: Object as PropType<Movie>,
    },
  },
  data() {
    return {
      loading: true,
      showInfos: false,
    };
  },
  methods: {
    pushToMovie(id?: string): void {
      this.$router.push({ name: 'movie', params: { id: id } });
    },
    isRating() {
      return this.movie?.notes?.length;
    },
    getNoteAverage() {
      if (!this.movie?.notes?.length) {
        return 0;
      }
      let sum = 0;
      let count = 0;
      for (const note of this.movie.notes) {
        sum += note.note;
        count++;
      }
      const average = sum / count;
      return average.toFixed(1);
    },
    getChipColor() {
      const averageNote = this.getNoteAverage();

      if (averageNote === null || averageNote === undefined) {
        return ['grey', 'sym_o_star', 'white'];
      }

      if (averageNote <= 5) {
        return ['negative', 'sym_o_star', 'white'];
      }

      if (averageNote > 5 && averageNote <= 7) {
        return ['orange', 'star_half', 'black'];
      }

      if (averageNote > 7 && averageNote <= 9.5) {
        return ['positive', 'star'];
      }

      if (averageNote > 9.5) {
        return ['kb-primary', 'hotel_class'];
      }

      return ['grey', 'sym_o_star'];
    },
  },
});
</script>

<style lang="scss" scoped>
.container-img {
  display: inline-block;
  max-height: 320px !important;

  .hover-text {
    color: white;
    bottom: 30px;

    .text-div {
      background-color: rgba(120, 120, 120, 0.4);
    }
  }

  .on-hover {
    transition: 0.2s ease-out;
  }

  .image-cls {
    max-width: 100% !important;

    border-radius: 10px;

    transition: 0.2s ease-out;

    &:hover {
      transform: scale(1.1);
    }
  }
}

.v-enter-active,
.v-leave-active {
  transition: opacity 0.3s ease-out;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}
</style>
