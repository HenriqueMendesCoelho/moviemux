<template>
  <main>
    <div class="panel-main">
      <div class="movie-img"></div>
      <div class="movie-infos"></div>
      <div class="movie-notes"></div>
      <div class="movie-trailers"></div>
    </div>
  </main>
</template>

<script lang="ts">
import { mapState } from "pinia";
import { defineComponent } from "vue-demi";
import { useStyleStore } from "../../stores/StyleStore";
import Movie from "@/domain/movie/Movie";

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
  mounted() {
    let movie = new Movie();
    console.log(movie);

    movie.id = 555;
    console.log(movie);
  },
  updated() {
    if (this.$route.name === "add") {
      this.idPathParam = "";
      //TODO: Insert code to reset all field of movie store, because in this moment user switch to addMovie
    }
  },
});
</script>

<style lang="scss" scoped>
main {
  display: flex;
  flex-direction: column;

  margin-top: 1.5rem;
  margin-left: v-bind(getMarginSideBar);

  max-width: 100%;
  min-height: 100vh;

  transition: 0.2s ease-out;

  overflow: hidden;

  border-top-left-radius: 10px;
  background: var(--grey-dark2);
  box-shadow: 0 10px 30px var(--shadow);

  .panel-main {
    color: white;
    background: var(--grey-dark2);
  }
}
</style>
