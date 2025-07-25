<template>
  <div class="row justify-center">
    <div class="text-responsive-2">Lista de usuários</div>
    <BaseHorizontalSeparator />
    <div class="col-md-10 col-xs-12 q-my-md">
      <BaseTableCopyDelete
        :title="'Lista de usuários'"
        :columns="columns"
        :edit="false"
        :rows="users"
        @copy="actionCopy($event as User)"
        @delete="actionDelete($event as User)"
        :loading="loading"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { copyToClipboard } from 'quasar';

import type { QTableColumn } from 'quasar';

import type User from 'src/core/domain/user/User';

import BaseTableCopyDelete from 'src/core/components/BaseTableCopyDelete.vue';
import BaseHorizontalSeparator from 'src/core/components/BaseHorizontalSeparator.vue';
import UserService from 'src/core/services/UserService';
import { showError, showSuccess } from 'src/core/utils/NotificationUtils';
import DateUtils from 'src/core/utils/DateUtils';

const columns: QTableColumn[] = [
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

    format: (val) => DateUtils.toLocaleString(val),
  },
  {
    name: 'dtUpdated',
    label: 'Data da ultima modificação',
    field: 'updated_at',
    align: 'center',

    format: (val) => DateUtils.toLocaleString(val),
  },
  {
    name: 'lastLoginAt',
    label: 'Último acesso',
    field: (row) => row.statistics.last_login_at,
    align: 'center',

    format: (val) => (val ? DateUtils.toLocaleString(val) : 'Não Registrado'),
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
    const res = await UserService.listUsersAdm();
    users.value = res;
  } catch {
    showError('Erro ao buscar usuarios');
  }
});

async function actionCopy(user?: User) {
  if (!user) {
    showError('Nenhum usuario encontrado');
    return;
  }
  if (!user.email) {
    showError('Usuario não possui e-mail');
    return;
  }
  await copyToClipboard(user.email);
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
