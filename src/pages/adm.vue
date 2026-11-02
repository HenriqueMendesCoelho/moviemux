<script setup lang="ts">
import View from '~/modules/administrator/views/AdministratorView.vue';
definePageMeta({ name: 'adm', layout: 'default', roles: ['ADM'] });
useHead({ title: 'Movie Mux - ADM' });
</script>
<template><View /></template>
