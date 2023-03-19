<template>
  <div class="row full-width justify-center">
    <div class="col-10 container-img justify-center" style="border-radius: 50px">
      <figure v-show="!loading">
        <img
          id="card-img-id"
          class="image-cls"
          :src="url"
          @click="pushToMovie(id)"
          :style="`max-height: ${height}px;`"
          @load="disableLoading"
        />
        <figcaption>{{ getTitle(20) }}</figcaption>
      </figure>
      <div v-if="loading" class="col-10 justify-center q-my-md">
        <q-spinner color="kb-primary" size="50px" />
      </div>
      <ContextMenuHome :movie-id="id || ''" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import ContextMenuHome from '../../contextMenuHome/ContextMenuHome.vue';

export default defineComponent({
  name: 'CardImageLastMovies',
  components: { ContextMenuHome },
  props: {
    id: {
      type: String,
    },
    url: {
      type: String,
    },
    title: {
      type: String,
    },
    height: {
      type: Number,
      default: 300,
    },
  },
  data() {
    return {
      loading: true,
    };
  },
  methods: {
    pushToMovie(id?: string): void {
      this.$router.push({ name: 'movie', params: { id: id } });
    },
    getTitle(size: number): string | void {
      if (!this.title) {
        return;
      }
      if (this.title.length > size) {
        return `${this.title.slice(0, size - 3)}...`;
      }

      return this.title;
    },
    disableLoading() {
      setTimeout(() => {
        this.loading = !this.loading;
      }, 100);
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
  .image-cls {
    max-width: 100% !important;

    object-fit: cover;

    border-radius: 10px;

    transition: 0.2s ease-out;

    &:hover {
      transform: scale(1.05);
    }
  }
}
</style>
