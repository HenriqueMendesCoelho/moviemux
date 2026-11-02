<template>
  <div v-if="movieId">
    <button type="button" class="mm-button mm-button-ghost" @click="visible = true">
      Ver elenco e equipe</button
    ><BaseDialogCast v-model="visible" :movie-id="movieId" />
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import BaseDialogCast from './BaseDialogCast.vue';
defineProps<{ movieId?: number }>();
const visible = ref(false);
</script>
