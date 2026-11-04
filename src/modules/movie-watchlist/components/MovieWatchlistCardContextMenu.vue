<template>
  <BaseContextMenu
    ><div class="mm-list-options">
      <button type="button" :disabled="disabled" @click.prevent="emit('copy-url')">
        <BaseIcon name="share" />{{ t('library.copyLink') }}</button
      ><button
        class="mm-delete-list"
        type="button"
        :disabled="disabled"
        @click.prevent="emit('delete')"
      >
        <BaseIcon name="close" />{{ t('library.deleteList') }}
      </button>
    </div></BaseContextMenu
  >
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
import BaseContextMenu from 'src/core/components/BaseContextMenu.vue';
import BaseIcon from 'src/core/components/BaseIcon.vue';
defineProps<{ disabled?: boolean }>();
const emit = defineEmits<{ delete: []; 'copy-url': [] }>();
</script>
<style scoped>
.mm-list-options {
  display: grid;
}
.mm-list-options button {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  text-align: left;
  border-radius: 8px;
  min-height: 44px;
}
.mm-list-options button:hover {
  background: var(--mm-raised);
}
.mm-list-options .mm-delete-list {
  color: var(--mm-danger, #c44358);
  border-top: 1px solid var(--mm-border);
  margin-top: 4px;
  border-radius: 0 0 8px 8px;
}
</style>
