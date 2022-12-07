<template>
  <q-tooltip style="font-size: 10pt; background-color: rgb(41, 50, 68, 0.9)"><slot></slot></q-tooltip>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'CustomTooltip',
});
</script>
