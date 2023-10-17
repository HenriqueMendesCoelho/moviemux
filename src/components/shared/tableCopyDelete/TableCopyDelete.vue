<template>
  <q-table
    :title="props.title"
    :style="`max-height: 350px !important`"
    :rows="props.rows"
    dense
    dark
    card-class="text-white bg-grey-mid2"
    row-key="index"
    virtual-scroll
    no-data-label="Não encontrei nada :("
    :rows-per-page-options="[0]"
    :columns="props.columns"
  >
    <template v-slot:body-cell-actions="props">
      <q-td :props="props">
        <q-btn dense round flat color="white" icon="content_copy" @click="emit('copy', props.row)">
          <CustomTooltip :delay="300" :hide-delay="300">Copiar</CustomTooltip>
        </q-btn>
        <q-btn dense round flat color="white" icon="delete" @click="emit('delete', props.row)">
          <CustomTooltip :delay="300" :hide-delay="300">Deletar</CustomTooltip>
        </q-btn>
      </q-td>
    </template>
  </q-table>
</template>

<script setup lang="ts">
import type { QTableProps } from 'quasar';

import CustomTooltip from '../customTooltip/CustomTooltip.vue';

interface Props {
  title: string;
  columns: QTableProps['columns'];
  rows?: object[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'copy', value: object): void;
  (e: 'delete', value: object): void;
}>();
</script>
