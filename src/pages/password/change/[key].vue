<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
import View from '~/modules/change-password/views/ChangePasswordView.vue';
definePageMeta({ name: 'ChangePassword', layout: 'public', roles: ['UNSECURE'] });
useHead(() => ({ title: `Movie Mux - ${t('pages.changePassword')}` }));
</script>
<template><View /></template>
