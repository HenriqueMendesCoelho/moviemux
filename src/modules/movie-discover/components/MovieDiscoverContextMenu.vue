<template>
  <BaseContextMenu>
    <q-list style="min-width: 100px">
      <q-item clickable @click="emit('copy-url', props.movieId)" v-close-popup>
        <span class="material-icons" style="font-size: 25pt"> link </span>
        <q-item-section class="q-pl-sm">Copiar URL</q-item-section>
      </q-item>
    </q-list>
  </BaseContextMenu>
</template>

<script lang="ts" setup>
import BaseContextMenu from 'src/core/components/BaseContextMenu.vue';

interface Props {
  movieId: number;
  deleteEnable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  deleteEnable: false,
});

const emit = defineEmits<{
  (e: 'copy-url', value: number): void;
}>();
</script>
