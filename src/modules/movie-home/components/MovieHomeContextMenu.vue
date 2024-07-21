<template>
  <BaseContextMenu>
    <q-list style="min-width: 100px">
      <q-item clickable @click="copyMovie(props.movieId)" v-close-popup>
        <span class="material-icons" style="font-size: 25pt"> link </span>
        <q-item-section class="q-pl-sm">Copiar URL</q-item-section>
      </q-item>
      <q-item clickable @click="openNewMovieTab(props.movieId)" v-close-popup>
        <span class="material-icons" style="font-size: 25pt"> open_in_new </span>
        <q-item-section class="q-pl-sm">Abrir em nova guia</q-item-section>
      </q-item>
      <q-item clickable @click="deleteMovie()" v-close-popup v-if="deleteEnable">
        <span class="material-icons" style="font-size: 25pt"> delete </span>
        <q-item-section class="q-pl-sm">Excluir</q-item-section>
      </q-item>
    </q-list>
  </BaseContextMenu>
</template>

<script lang="ts" setup>
import BaseContextMenu from 'src/core/components/BaseContextMenu.vue';

interface Props {
  movieId: string;
  deleteEnable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  deleteEnable: false,
});

function copyMovie(id?: string) {
  const url = `${window.location.origin}/movie/${id}`;
  navigator.clipboard.writeText(url);
  return url ? url : '';
}
function openNewMovieTab(id?: string) {
  const url: string = copyMovie(id);
  const w = window.open(url);
  if (w) w.focus();
}
function deleteMovie() {
  throw Error('Not Implemented Yet');
}
</script>
