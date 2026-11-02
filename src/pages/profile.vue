<script setup lang="ts">
import View from '~/modules/profile/views/ProfileView.vue';
definePageMeta({ name: 'profile', layout: 'default', roles: ['ADM', 'USER'] });
useHead({ title: 'Movie Mux - Perfil' });
</script>
<template><View /></template>
