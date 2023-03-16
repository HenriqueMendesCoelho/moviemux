<template v-if="convertedUrl">
  <div class="col-6 row" v-if="showTopButtons()">
    <div class="q-ml-md">
      <q-btn style="background-color: #343c4c" text-color="white" round icon="refresh" />
    </div>
    <div class="q-ml-md" v-if="!moviePage.isEditing">
      <q-btn
        style="width: 100%"
        color="primary"
        text-color="white"
        label="Editar"
        :disable="cantEdit()"
        @click="moviePage.isEditing = !moviePage.isEditing"
      />
      <q-tooltip v-if="cantEdit()"> O filme não foi cadastrado por você </q-tooltip>
    </div>
    <div class="q-ml-md">
      <q-btn v-if="true" style="width: 100%" color="red" text-color="white" label="Deletar" />
    </div>
  </div>
  <div :class="showTopButtons() ? 'col-2 offset-md-4' : 'col-2 offset-md-10'">
    <q-btn
      @click="moviePage.showImportMovieDialog = !moviePage.showImportMovieDialog"
      style="width: 100%"
      color="primary"
      text-color="white"
      label="Importar do TMDB"
      v-if="showBtnImport()"
      :disable="selectedMovieHasAnyFieldFilled()"
    />
  </div>
</template>

<script lang="ts">
import { mapActions, mapState } from 'pinia';
import { defineComponent } from 'vue';
import { RouteRecordName } from 'vue-router';

import { useMovieStore } from '@/stores/MovieStore';

export default defineComponent({
  name: 'SuperiorButtonsMovie',
  data() {
    return {};
  },
  computed: {
    ...mapState(useMovieStore, ['moviePage']),
    routeName(): RouteRecordName | null | undefined {
      return this.$route.name;
    },
  },
  methods: {
    ...mapActions(useMovieStore, ['selectedMovieHasAnyFieldFilled']),
    showBtnImport() {
      if (this.routeName === 'add') {
        return true;
      }

      return this.moviePage.isEditing;
    },
    cantEdit() {
      return false;
    },
    showTopButtons() {
      return this.routeName === 'movie';
    },
  },
});
</script>
