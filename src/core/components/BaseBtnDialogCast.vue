<template>
  <div v-if="props.movieId">
    <div class="text-h6">Elenco</div>
    <q-btn @click="showCastDialog = true" icon="groups" color="primary" size="lg" rounded />
    <BaseDialogCast v-model="showCastDialog" :movie-id="props.movieId" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

import BaseDialogCast from './BaseDialogCast.vue';

const props = defineProps<{ movieId?: number }>();
const showCastDialog = ref(false);
</script>
