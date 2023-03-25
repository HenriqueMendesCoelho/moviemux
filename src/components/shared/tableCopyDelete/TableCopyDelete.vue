<template>
  <q-table
    :title="title"
    :style="`background-color: ${color}; max-height: 350px !important`"
    :rows="rows"
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
        <q-btn dense round flat color="white" icon="content_copy" @click="actionCopy(props.row)">
          <CustomTooltip :delay="300" :hide-delay="300">Copiar</CustomTooltip>
        </q-btn>
        <q-btn dense round flat color="white" icon="delete" @click="actionDelete(props.row)">
          <CustomTooltip :delay="300" :hide-delay="300">Deletar</CustomTooltip>
        </q-btn>
      </q-td>
    </template>
  </q-table>
</template>

<script lang="ts">
import type { QTableProps } from 'quasar';
import { defineComponent, PropType } from 'vue';

import CustomTooltip from '../customTooltip/CustomTooltip.vue';

export default defineComponent({
  name: 'TableCopyDelete',
  components: {
    CustomTooltip,
  },
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
    actionCopy: {
      type: Function,
      required: true,
    },
    actionDelete: {
      type: Function,
      required: true,
    },
  },
});
</script>
