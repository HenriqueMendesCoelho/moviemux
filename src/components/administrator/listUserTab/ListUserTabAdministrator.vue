<template>
  <div class="row justify-center">
    <h5>Lista de usuários</h5>
    <SeparatorDivLineSolid />
    <div class="col-10 q-my-md">
      <TableEditDelete :title="'Lista de usuários'" :columns="columns" :edit="false" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { QTableProps } from 'quasar';

import TableEditDelete from '@/components/shared/tables/TableEditDelete.vue';
import SeparatorDivLineSolid from '@/components/shared/separator/SeparatorDivLineSolid.vue';

export default defineComponent({
  name: 'ListUserTabAdministrator',
  components: {
    TableEditDelete,
    SeparatorDivLineSolid,
  },
  setup() {
    const columns: QTableProps['columns'] = [
      {
        name: 'nome',
        label: 'Nome',
        field: 'name',
        align: 'left',
      },
      {
        name: 'email',
        label: 'E-mail',
        field: 'email',
        align: 'center',
      },
      {
        name: 'dtCreated',
        label: 'Data de criação',
        field: 'dt_created',
        align: 'center',
      },
      {
        name: 'actions',
        label: 'Ações',
        field: '',
        align: 'center',
      },
    ];
    return {
      columns,
    };
  },
});
</script>
