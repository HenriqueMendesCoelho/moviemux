<template>
  <p v-if="modelValue" class="mm-muted" role="note">
    {{ t('account.passwordTooltip') }}
  </p>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
defineProps<{ modelValue: boolean }>();
</script>
