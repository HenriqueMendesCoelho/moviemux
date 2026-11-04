<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
import View from '~/modules/movie/views/MovieAddView.vue';
definePageMeta({ name: 'add', layout: 'default', roles: ['ADM', 'USER'] });
useHead(() => ({ title: `Movie Mux - ${t('pages.addMovie')}` }));
</script>
<template><View /></template>
