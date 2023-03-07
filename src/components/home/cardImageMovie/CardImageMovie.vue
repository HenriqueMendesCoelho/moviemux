<template>
  <div class="container">
    <img
      :class="`${spaced && 'spaced'}`"
      @click="pushToMovie(id)"
      :src="url"
      :alt="title"
      draggable="false"
      :style="`max-height: ${height}px;`"
    />
    <div class="row hover-text" v-if="!footer">
      <div class="col-10">{{ getTitle(25) }}</div>
      <div class="col-2 div-note" :style="`background-color: ${getBackgroudColorNotes()}`">{{ note }}</div>
    </div>
  </div>
  <div v-if="footer" style="text-align: center">
    {{ getTitle(28) }}
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
    footer: {
      type: Boolean,
      default: false,
    },
    note: {
      type: Number,
    },
  },
  methods: {
    pushToMovie(id: number): void {
      this.$router.push({ name: 'movie', params: { id: id } });
    },
    getTitle(size: number): string | void {
      if (this.title.length > size) {
        return `${this.title.slice(0, size - 3)}...`;
      }

      return this.title;
    },
    getBackgroudColorNotes(): string {
      //grey
      if (!this.note) {
        return 'rgba(120, 120, 120, 0.4)';
      }
      //red
      if (this.note <= 5) {
        return 'rgb(255, 0, 0, 0.4)';
      }
      //gold
      if (this.note > 5 && this.note <= 7) {
        return 'rgb(255, 165, 0, 0.4)';
      }
      //green
      if (this.note > 7) {
        return 'rgb(0, 255, 0, 0.4)';
      }
      return '';
    },
  },
});
</script>

<style lang="scss" scoped>
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

    image-rendering: optimizeSpeed;

    border-radius: 15px;

    transition: 0.2s ease-out;

    box-shadow: 0 5px 30px var(--shadow);
  }

  &:hover {
    .hover-text {
      transition-delay: 400ms;
      opacity: 1;
    }

    img {
      transform: scale(1.1);

      transition: 0.2s ease-out;
    }
  }

  .hover-text {
    transition: 0.5s ease;
    opacity: 0;
    position: relative;
    top: -4rem;
    color: white;
    font-size: 14pt;
    background-color: rgb(41, 50, 68, 0.8);
    border-radius: 15px;

    .div-note {
      border-top-right-radius: 15px;
      border-bottom-right-radius: 15px;
    }
  }
}
</style>
