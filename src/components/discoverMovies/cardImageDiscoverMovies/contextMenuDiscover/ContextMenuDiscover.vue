<template>
  <ContextMenu>
    <q-list style="min-width: 100px">
      <q-item clickable @click="copyMovie(props.movieId)" v-close-popup>
        <span class="material-icons" style="font-size: 25pt"> link </span>
        <q-item-section class="q-pl-sm">Copiar URL</q-item-section>
      </q-item>
    </q-list>
  </ContextMenu>
</template>

<script lang="ts" setup>
import ContextMenu from 'src/components/shared/contextMenu/ContextMenu.vue';

interface Props {
  movieId: number;
  deleteEnable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  deleteEnable: false,
});

function copyMovie(id?: number) {
  if (!id) {
    return;
  }

  const url = `${window.location.origin}/movie/discover?movie=${id}`;
  navigator.clipboard.writeText(url);
  return url ? url : '';
}
</script>
