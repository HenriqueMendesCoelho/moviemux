<template>
  <q-tooltip class="bg-grey-mid" style="font-size: 10pt"><slot></slot></q-tooltip>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'CustomTooltip',
});
</script>
