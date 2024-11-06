<template>
  <BaseContextMenu>
    <q-list class="mw-menu">
      <q-item clickable @click="emit('copy-url')" v-close-popup>
        <q-item-section side>
          <q-icon name="link" color="white" />
        </q-item-section>
        <q-item-section class="q-pl-sm">Copiar Link</q-item-section>
      </q-item>
    </q-list>
  </BaseContextMenu>
</template>
<script setup lang="ts">
import BaseContextMenu from 'src/core/components/BaseContextMenu.vue';

const emit = defineEmits<{
  (e: 'copy-url', value: void): void;
}>();
</script>

<style scoped>
.mw-menu {
  min-width: 100px;
}
</style>
