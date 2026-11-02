<template>
  <p v-if="modelValue" class="mm-muted" role="note">
    Use letras maiúsculas e minúsculas, números e caracteres especiais (@ # $ ! % * ? &), entre 8 e
    70 caracteres.
  </p>
</template>
<script setup lang="ts">
defineProps<{ modelValue: boolean }>();
</script>
