<template>
  <ContextMenu>
    <q-list style="min-width: 100px">
      <q-item clickable @click="copyMovie(movieId)" v-close-popup>
        <span class="material-icons" style="font-size: 25pt"> link </span>
        <q-item-section class="q-pl-sm">Copiar URL</q-item-section>
      </q-item>
      <q-item clickable @click="openNewMovieTab(movieId)" v-close-popup>
        <span class="material-icons" style="font-size: 25pt"> open_in_new </span>
        <q-item-section class="q-pl-sm">Abrir em nova guia</q-item-section>
      </q-item>
      <q-item clickable @click="deleteMovie()" v-close-popup v-if="deleteEnable">
        <span class="material-icons" style="font-size: 25pt"> delete </span>
        <q-item-section class="q-pl-sm">Excluir</q-item-section>
      </q-item>
    </q-list>
  </ContextMenu>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import ContextMenu from '@/components/shared/contextMenu/ContextMenu.vue';

export default defineComponent({
  name: 'ContextMenuHome',
  props: {
    movieId: {
      type: Number,
      required: true,
    },
    deleteEnable: {
      type: Boolean,
      default: false,
    },
  },
  components: {
    ContextMenu,
  },
  methods: {
    copyMovie(id?: number) {
      const url = `${window.location.origin}/movie/${id}`;
      navigator.clipboard.writeText(url);
      return url ? url : '';
    },
    openNewMovieTab(id?: number) {
      const url: string = this.copyMovie(id);
      const w = window.open(url);
      if (w) w.focus();
    },
    deleteMovie() {
      return;
    },
  },
});
</script>
