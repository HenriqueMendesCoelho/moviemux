<template>
  <div class="container">
    <img
      :class="`${spaced && 'spaced'}`"
      @click="pushToMovie(id)"
      class="img-movies"
      :src="url"
      :alt="title"
      draggable="false"
      :style="`max-height: ${height}px;`"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'CardImageMovie',
  props: {
    id: {
      type: Number,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    height: {
      type: Number,
      default: 300,
    },
    spaced: {
      type: Boolean,
      default: true,
    },
  },
  methods: {
    pushToMovie(id: number): void {
      this.$router.push({ name: 'movie', params: { id: id } });
    },
  },
});
</script>

<style lang="scss">
.container {
  /* topo | direita | inferior | esquerda */
  .spaced {
    margin: 1.5rem 3rem 1rem 3rem;

    @media (max-width: 1920px) {
      margin: 1rem 2rem 1rem 2rem;
    }

    @media (max-width: 768px) {
      margin: 1rem 15px 1rem 15px;
    }
  }

  img {
    max-width: 100%;
    object-fit: cover;

    border-radius: 15px;

    transition: 0.2s ease-out;

    box-shadow: 0 5px 30px var(--shadow);

    &:hover {
      transform: scale(1.1);

      transition: 0.2s ease-out;
    }
  }
}
</style>
