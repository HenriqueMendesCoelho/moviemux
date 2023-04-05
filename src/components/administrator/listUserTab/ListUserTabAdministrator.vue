<template>
  <div class="row justify-center">
    <h5>Lista de usuários</h5>
    <SeparatorDivLineSolid />
    <div class="col-10 q-my-md">
      <TableCopyDelete
        :title="'Lista de usuários'"
        :columns="columns"
        :edit="false"
        :rows="users"
        :actionCopy="actionCopy"
        :actionDelete="actionDelete"
        :loading="loading"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useQuasar } from 'quasar';
import type { QTableProps } from 'quasar';

import TableCopyDelete from '@/components/shared/tableCopyDelete/TableCopyDelete.vue';
import SeparatorDivLineSolid from '@/components/shared/separator/SeparatorDivLineSolid.vue';
import User from '@/domain/user/User';
import UserService from '@/services/UserService';

export default defineComponent({
  name: 'ListUserTabAdministrator',
  components: {
    TableCopyDelete,
    SeparatorDivLineSolid,
  },
  setup() {
    const $q = useQuasar();
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
        name: 'roles',
        label: 'Perfis de acesso',
        field: 'roles',
        align: 'center',
        format: (val) => val.join(', '),
      },
      {
        name: 'dtCreated',
        label: 'Data de criação',
        field: 'created_at',
        align: 'center',
        format: (val) => new Date(val).toLocaleString(),
      },
      {
        name: 'dtUpdated',
        label: 'Data da ultima modificação',
        field: 'updated_at',
        align: 'center',
        format: (val) => new Date(val).toLocaleString(),
      },
      {
        name: 'actions',
        label: '',
        field: '',
        align: 'center',
      },
    ];
    return {
      columns,
      showSuccess(msg: string) {
        $q.notify({
          type: 'positive',
          message: msg,
          position: 'top',
        });
      },
      showError(msg: string) {
        $q.notify({
          type: 'negative',
          message: msg,
          position: 'top',
        });
      },
    };
  },
  data() {
    return {
      users: [] as User[],
      loading: false,
    };
  },
  async mounted() {
    try {
      const res = await UserService.listUsers();
      this.users = res;
    } catch {
      this.showError('Erro ao buscar usuarios');
    }
  },
  methods: {
    actionCopy(user?: User) {
      if (!user) {
        this.showError('Nenhum usuario encontrado');
        return;
      }
      if (!user.email) {
        this.showError('Usuario não possui e-mail');
        return;
      }
      navigator.clipboard.writeText(user.email);
      this.showSuccess('E-mail do usuario copiado');
    },
    async actionDelete(user?: User) {
      if (!user) {
        return;
      }
      try {
        this.loading = true;
        await UserService.deleteUser(user.id);
        this.showSuccess('Usuario deletado');
      } catch {
        this.showError('Erro ao deletar usuario');
      } finally {
        this.loading = false;
      }
    },
  },
});
</script>
