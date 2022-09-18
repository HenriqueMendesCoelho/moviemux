<template>
  <q-table
    :title="title"
    :rows="mock"
    :style="styleTable"
    dark
    card-class="bg-blue-grey-10 text-white"
    row-key="index"
    virtual-scroll
    no-data-label="Não encontrei nada :("
  />
</template>

<script lang="ts">
import { defineComponent } from 'vue';
export default defineComponent({
  name: 'TableNoHeader',
  props: {
    title: {
      type: String,
      required: false,
    },
    rows: {
      type: Array,
      required: false,
    },
    height: {
      type: Number,
      required: false,
      default: 300,
    },
  },
  data() {
    return {
      mock: [
        {
          nome: 'Henrique',
          nota: 9,
          data: '18/09/2022 19:50:55',
        },
        {
          nome: 'Yuri Boga',
          nota: 7,
          data: '18/09/2022 19:50:55',
        },
        {
          nome: 'Juan Boga',
          nota: 7,
          data: '18/09/2022 19:50:55',
        },
      ],
    };
  },
  computed: {
    styleTable() {
      console.log(this.height);
      return `height: ${this.height}px`;
    },
  },
});
</script>

<style></style>
