<template>
  <div class="row justify-center">
    <h5>Gerenciamento de convites</h5>
    <SeparatorDivLineSolid />
    <div class="col-10 q-mt-md">
      <div class="row">
        <div class="col-2">
          <q-btn style="width: 100%; height: 100%" color="info" text-color="white" label="Gerar convite" :disable="false" />
        </div>
        <div class="q-pl-md col-5">
          <InputText :label="'Convite gerado'" v-model="convite" :required="false" :readOnly="true" :dense="true" />
        </div>
        <div class="col-12 q-mt-md">
          <TableEditDelete :title="'Lista de convites'" :columns="columns" :edit="false" :rows="rows" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { QTableProps } from 'quasar';

import InputText from '@/components/shared/inputText/InputText.vue';
import TableEditDelete from '@/components/shared/tables/TableEditDelete.vue';
import SeparatorDivLineSolid from '@/components/shared/separator/SeparatorDivLineSolid.vue';

export default defineComponent({
  name: 'ListUserTabAdministrator',
  components: {
    InputText,
    TableEditDelete,
    SeparatorDivLineSolid,
  },
  setup() {
    const columns: QTableProps['columns'] = [
      {
        name: 'invite',
        label: 'Convite',
        field: 'invite',
        align: 'left',
      },
      {
        name: 'dtCreated',
        label: 'Data de criação',
        field: 'dt_creation',
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
  data() {
    return {
      convite: '',
      rows: [],
    };
  },
});
</script>
