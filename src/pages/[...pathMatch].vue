<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
import View from '~/modules/not-found/views/NotFoundView.vue';
definePageMeta({ name: 'notFound', layout: 'public', roles: ['UNSECURE'] });
useHead(() => ({ title: `Movie Mux - ${t('pages.notFound')}` }));
</script>
<template><View /></template>
