<template>
  <div class="container-main">
    <h1>Teste</h1>
    <h1>{{ idPathParam }}</h1>
  </div>
</template>

<script lang="ts">
import { mapState } from "pinia";
import { defineComponent } from "vue-demi";
import { useStyleStore } from "../../stores/StyleStore";

export default defineComponent({
  name: "MovieApp",
  data() {
    return {
      idPathParam: this.$route.params.id,
    };
  },
  computed: {
    ...mapState(useStyleStore, ["getMarginSideBar"]),
  },
  updated() {
    if (this.$route.name === "add") {
      this.idPathParam = "";
      //TODO: Insert code to reset all field of movie store, because in this moment user switch to addMovie
    }
  },
});
</script>

<style>
.container-main {
  height: 100vh;
  max-width: 100%;

  margin-top: 1.5rem;
  margin-left: v-bind(getMarginSideBar);

  transition: 0.2s ease-out;
}
</style>
