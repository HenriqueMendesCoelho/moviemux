<template>
  <BaseFloatingActionBtn
    ><template #after-top
      ><router-link class="mm-button mm-button-primary" :to="{ name: 'add' }"
        >+ Adicionar filme</router-link
      ></template
    ></BaseFloatingActionBtn
  >
</template>
<script setup lang="ts">
import BaseFloatingActionBtn from 'src/core/components/BaseFloatingActionBtn.vue';
</script>
