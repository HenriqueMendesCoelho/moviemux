<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
import View from '~/modules/profile/views/ProfileView.vue';
definePageMeta({ name: 'profile', layout: 'default', roles: ['ADM', 'USER'] });
useHead(() => ({ title: `Movie Mux - ${t('pages.profile')}` }));
</script>
<template><View /></template>
