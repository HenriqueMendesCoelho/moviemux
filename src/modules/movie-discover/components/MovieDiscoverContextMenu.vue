<template>
  <button type="button" class="mm-button" @click.stop.prevent="emit('copy-url', movieId)">
    {{ t('catalog.copyLink') }}
  </button>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
defineProps<{ movieId: number; deleteEnable?: boolean }>();
const emit = defineEmits<{ 'copy-url': [id: number] }>();
</script>
