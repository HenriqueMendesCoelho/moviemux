<template>
  <q-table
    :title="title"
    :rows="rows"
    :style="`background-color: ${color};`"
    dense
    dark
    card-class="text-white"
    row-key="index"
    virtual-scroll
    no-data-label="Não encontrei nada :("
    :rows-per-page-options="[0]"
    :columns="columns"
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
import type { QTableProps } from 'quasar';
import { defineComponent, PropType } from 'vue';

export default defineComponent({
  name: 'TableEditDelete',
  props: {
    title: {
      type: String,
    },
    color: {
      type: String,
      default: '#343c4c',
    },
    columns: {
      type: Array as PropType<QTableProps['columns']>,
      required: true,
    },
    rows: {
      type: Array,
      required: false,
    },
    edit: {
      type: Boolean,
      required: false,
      default: true,
    },
  },
});
</script>
