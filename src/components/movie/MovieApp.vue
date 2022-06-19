<template>
  <main>
    <div class="container-main">
      <div class="container-infos-img">
        <img
          :src="
            selectedMovie.image
              ? selectedMovie.image
              : 'https://cdn.discordapp.com/attachments/713552377348882434/987853775450566666/unknown.png'
          "
          :alt="selectedMovie.titleEn ? selectedMovie.titleEn : 'placeholder'"
          draggable="false"
        />

        <div class="movie-infos-inputs">
          <h2>Informações</h2>
          <SeparatorDiv />
          <label for="tituloPTBR">Título PT-BR</label>
          <input
            type="text"
            name="tituloPTBR"
            placeholder="Título"
            v-model="selectedMovie.titleBr"
          />
          <label for="tituloEN">Título EN</label>
          <input
            type="text"
            name="tituloEN"
            placeholder="Título"
            v-model="selectedMovie.titleEn"
          />
          <label for="Ano">Ano de lançamento</label>
          <input
            type="text"
            name="Ano"
            placeholder="Ano"
            v-model="selectedMovie.year"
          />
          <label for="Diretor">Diretor</label>
          <input
            type="text"
            name="Diretor"
            placeholder="Diretor"
            v-model="selectedMovie.director"
          />
          <label for="url" v-show="showUrls()">URL da Imagem</label>
          <input
            type="text"
            name="url"
            placeholder="Url"
            v-model="selectedMovie.image"
            v-show="showUrls()"
          />
          <label for="url1" v-show="showUrls()">URL do trailer dublado</label>
          <input
            type="text"
            name="url1"
            placeholder="Url"
            v-model="selectedMovie.trailerBr"
            v-show="showUrls()"
          />
          <label for="url2" v-show="showUrls()">URL do trailer legendado</label>
          <input
            type="text"
            name="url2"
            placeholder="Url"
            v-model="selectedMovie.trailerEn"
            v-show="showUrls()"
          />
          <label for="description">Descrição - Sinopse</label>
          <textarea
            name="description"
            id="description"
            rows="5"
            placeholder="Descrição"
            maxlength="1000"
            v-model="selectedMovie.description"
          ></textarea>
        </div>
      </div>
      <div class="container-notes-trailers">
        <div class="movie-notes"></div>
        <div class="movie-trailers"></div>
      </div>
    </div>
  </main>
</template>

<script lang="ts">
import { defineComponent } from "vue-demi";

import { mapActions, mapState } from "pinia";
import { useStyleStore } from "../../stores/StyleStore";
import { useMovieStore } from "@/stores/MovieStore";

import SeparatorDiv from "@/components/shared/separator/SeparatorDiv.vue";

export default defineComponent({
  name: "MovieApp",
  components: {
    SeparatorDiv,
  },
  data() {
    return {
      idPathParam: this.$route.params.id,
    };
  },
  computed: {
    ...mapState(useStyleStore, ["getMarginSideBar"]),
    ...mapState(useMovieStore, ["selectedMovie"]),
  },
  updated() {
    if (this.$route.name === "add") {
      this.idPathParam = "";
      //TODO: Insert code to reset all field of movie store, because in this moment user switch to addMovie
    }
  },
  methods: {
    ...mapActions(useMovieStore, ["cleanSelectedMovie"]),
    showUrls() {
      return !this.idPathParam;
    },
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
  min-height: calc(100vh - 1.5rem);

  transition: 0.2s ease-out;

  border-top-left-radius: 10px;
  background: var(--grey-dark2);
  box-shadow: 0 10px 30px var(--shadow);

  .container-main {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: auto;

    color: white;
    background: var(--grey-dark2);

    .container-infos-img {
      display: flex;
      height: 70vh;

      overflow: hidden;

      //background-color: var(--grey-mid);

      //border: solid 5px green;

      padding: 15px 15px;

      img {
        //border: solid 5px rosybrown;
        border-radius: 20px;
        height: 100%;
      }

      .movie-infos-inputs {
        display: flex;
        flex-wrap: wrap;

        text-align: start;
        justify-content: start;

        //border: solid 5px blue;
        width: 100%;
        height: 100%;
        margin-left: 10px;

        overflow-y: auto;

        //padding-top: 15px;
        //padding-bottom: 10px;
        padding-right: 10px;

        input {
          color: var(--light-grey2);
          width: 100%;
          //height: 10%;
          border-radius: 8px;
          margin-bottom: 15px;
          padding: 15px;

          box-shadow: 0 5px 30px var(--shadow);

          box-sizing: border-box;
          border: none;
          outline: none;

          background-color: var(--grey-mid2);

          input::placeholder {
            max-width: 100%;
            color: var(--light-grey2);
          }
        }

        textarea {
          padding: 15px;
          color: var(--light-grey2);
          width: 100%;
          border-radius: 8px;

          box-shadow: 0 5px 30px var(--shadow);

          box-sizing: border-box;
          border: none;
          outline: none;

          background-color: var(--grey-mid2);
        }
      }
    }
    .container-notes-trailers {
      //border: solid 5px yellow;
      height: auto;
    }
  }
}
</style>
