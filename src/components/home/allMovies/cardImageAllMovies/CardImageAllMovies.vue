<template>
  <div class="row full-width justify-center">
    <div
      class="col-10 container-img justify-center"
      style="border-radius: 50px"
      @mouseover="showInfos = true"
      @mouseleave="showInfos = false"
    >
      <q-img
        @click="pushToMovie(movie?.id)"
        @mouseup.middle.prevent="openNewMovieTab($event, movie?.id)"
        class="image-cls"
        :src="movie?.url_image"
        spinner-color="kb-primary"
        :key="movie?.id"
        height="320px"
        no-native-menu
        :draggable="false"
        style="cursor: pointer"
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
          <ChipNote dense size="lg" :movie="movie" style="top: 8px; left: 8px" v-if="showInfos && isRating()" />
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
import ChipNote from '@/components/shared/chipNote/ChipNote.vue';

export default defineComponent({
  name: 'CardImageAllMovies',
  components: { ContextMenuHome, CustomTooltip, ChipNote },
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
    copyMovie(id?: string) {
      const url = `${window.location.origin}/movie/${id}`;
      navigator.clipboard.writeText(url);
      return url ? url : '';
    },
    openNewMovieTab(event: MouseEvent, id?: string) {
      event.preventDefault();
      const url: string = this.copyMovie(id);
      const w = window.open(url);
      if (w) w.focus();
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
