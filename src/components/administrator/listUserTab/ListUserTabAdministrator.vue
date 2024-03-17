<template>
  <div class="row justify-center">
    <div class="text-responsive-2">Lista de usuários</div>
    <SeparatorDivLineSolid />
    <div class="col-md-10 col-xs-12 q-my-md">
      <TableCopyDelete
        :title="'Lista de usuários'"
        :columns="columns"
        :edit="false"
        :rows="users"
        @copy="actionCopy"
        @delete="actionDelete"
        :loading="loading"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue';

import type { QTableProps } from 'quasar';

import User from 'src/domain/user/User';

import TableCopyDelete from 'src/components/shared/tableCopyDelete/TableCopyDelete.vue';
import SeparatorDivLineSolid from 'src/components/shared/separator/SeparatorDivLineSolid.vue';
import UserService from 'src/services/UserService';
import { showError, showSuccess } from 'src/utils/NotificationUtils';

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
const users = ref<User[]>([]);
const loading = ref(false);

onMounted(async () => {
  try {
    const res = await UserService.listUsers();
    users.value = res;
  } catch {
    showError('Erro ao buscar usuarios');
  }
});

function actionCopy(user?: User) {
  if (!user) {
    showError('Nenhum usuario encontrado');
    return;
  }
  if (!user.email) {
    showError('Usuario não possui e-mail');
    return;
  }
  navigator.clipboard.writeText(user.email);
  showSuccess('E-mail do usuario copiado');
}

async function actionDelete(user?: User) {
  if (!user) {
    return;
  }
  try {
    loading.value = true;
    await UserService.deleteUser(user.id);
    showSuccess('Usuario deletado');
  } catch {
    showError('Erro ao deletar usuario');
  } finally {
    loading.value = false;
  }
}
</script>
