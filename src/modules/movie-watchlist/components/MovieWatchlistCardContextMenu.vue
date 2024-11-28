<template>
  <BaseContextMenu>
    <q-list style="min-width: 100px">
      <q-item clickable @click="emit('copy-url')" v-close-popup>
        <q-item-section side>
          <q-icon name="link" color="white" />
        </q-item-section>
        <q-item-section class="q-pl-sm">Copiar URL</q-item-section>
      </q-item>
      <q-item clickable @click="emit('copy-url')" v-close-popup>
        <q-item-section side>
          <q-icon name="delete" color="white" />
        </q-item-section>
        <q-item-section class="q-pl-sm">Deletar Lista</q-item-section>
      </q-item>
    </q-list>
  </BaseContextMenu>
</template>
<script setup lang="ts">
import BaseContextMenu from 'src/core/components/BaseContextMenu.vue';

const emit = defineEmits<{
  (e: 'delete', value: void): void;
  (e: 'copy-url', value: void): void;
}>();
</script>
