<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
defineOptions({ name: 'MovieMuxHomePage' });
import View from '~/modules/movie-home/views/MovieHomeView.vue';
definePageMeta({ name: 'home', layout: 'default', roles: ['ADM', 'USER'] });
useHead(() => ({ title: `Movie Mux - ${t('pages.home')}` }));
</script>
<template><View /></template>
