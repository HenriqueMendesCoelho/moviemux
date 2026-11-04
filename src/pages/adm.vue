<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
import View from '~/modules/administrator/views/AdministratorView.vue';
definePageMeta({ name: 'adm', layout: 'default', roles: ['ADM'] });
useHead(() => ({ title: `Movie Mux - ${t('pages.admin')}` }));
</script>
<template><View /></template>
