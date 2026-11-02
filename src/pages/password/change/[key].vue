<script setup lang="ts">
import View from '~/modules/change-password/views/ChangePasswordView.vue';
definePageMeta({ name: 'ChangePassword', layout: 'public', roles: ['UNSECURE'] });
useHead({ title: 'Movie Mux - Alterar Senha' });
</script>
<template><View /></template>
