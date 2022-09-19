<template>
  <q-table
    :title="title"
    :rows="mock"
    :style="styleTable"
    dense
    dark
    card-class="text-white"
    row-key="index"
    virtual-scroll
    no-data-label="Não encontrei nada :("
    :rows-per-page-options="[0]"
    :columns="column"
  />
</template>

<script lang="ts">
import { defineComponent } from 'vue';
export default defineComponent({
  name: 'TableNoHeader',
  props: {
    title: {
      type: String,
    },
    color: {
      type: String,
      default: '#343c4c',
    },
    rows: {
      type: Array,
      required: false,
    },
    height: {
      type: Number,
      required: true,
      default: 300,
    },
  },
  data() {
    return {
      column: [
        {
          name: 'nome',
          label: 'Nome',
          field: 'name',
          align: 'left',
        },
        {
          name: 'nota',
          label: 'Nota',
          field: 'note',
          align: 'left',
        },
        {
          name: 'data',
          label: 'Data',
          field: 'data',
          align: 'left',
        },
      ],
      mock: [
        {
          name: 'Henrique',
          note: 9,
          data: '18/09/2022 19:50:55',
        },
        {
          name: 'Yuri Boga',
          note: 7,
          data: '18/09/2022 19:50:55',
        },
        {
          name: 'Juan Boga',
          note: 7,
          data: '18/09/2022 19:50:55',
        },
      ],
    };
  },
  computed: {
    styleTable() {
      return `height: ${this.height}px; background-color: ${this.color};`;
    },
  },
});
</script>

<style></style>
