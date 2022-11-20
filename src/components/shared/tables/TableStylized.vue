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
  >
    <template v-slot:body-cell-actions="props">
      <q-td :props="props">
        <q-btn dense round flat color="white" icon="edit" v-if="edit">
          <q-tooltip>Editar</q-tooltip>
        </q-btn>
        <q-btn dense round flat color="white" icon="delete">
          <q-tooltip>Deletar</q-tooltip>
        </q-btn>
      </q-td>
    </template>
  </q-table>
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
    edit: {
      type: Boolean,
      required: false,
      default: true,
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
          align: 'center',
        },
        {
          name: 'data',
          label: 'Data',
          field: 'data',
          align: 'center',
        },
        { name: 'actions', label: 'Ações', field: '', align: 'center' },
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
