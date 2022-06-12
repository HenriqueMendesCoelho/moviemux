<template>
  <transition>
    <div class="card-lastfilm">
      <img :src="url" :alt="title" draggable="false" />
      <h6>{{ title }}</h6>
    </div>
  </transition>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  props: ["title", "url"],
  methods: {},
});
</script>

<style lang="scss" scoped>
.card-lastfilm {
  display: flex;
  flex-direction: column;
  height: 100%;

  margin: 0px 30px;

  justify-content: center;
  align-items: flex-start;

  color: black;
  //background: var(--light-grey);
  border-radius: 15px;

  transition: 0.2s ease-out;

  h6 {
    font-size: 12pt;
    margin-top: 10px;

    color: var(--light-grey);

    text-transform: uppercase;

    transition: 0.2s ease-out;
  }

  img {
    max-width: 100%;
    max-height: 80%;
    border-radius: 10px;

    transition: 0.2s ease-out;

    &:hover {
      transform: scale(1.1);
      transition: 0.2s ease-out;

      cursor: pointer;
    }
  }
  @media (max-width: 768px) {
    width: 100%;
  }
}
</style>
