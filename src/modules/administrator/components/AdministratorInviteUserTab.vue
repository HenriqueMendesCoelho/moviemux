<template>
  <div class="row justify-center">
    <h5>Gerenciamento de convites</h5>
    <BaseHorizontalSeparator />
    <div class="col-md-10 q-mt-md">
      <div class="row">
        <div class="col-md-2 col-xs-6">
          <q-btn
            style="width: 100%; height: 100%"
            color="info"
            text-color="white"
            label="Gerar convite"
            @click="createInvite"
          />
        </div>
        <div class="q-pl-md col-md-5 col-xs-6">
          <BaseTextInput
            :label="'Convite gerado'"
            v-model="invite"
            :required="false"
            :readonly="true"
            :dense="true"
          />
        </div>
        <div class="col-12 q-mt-md">
          <BaseTableCopyDelete
            :title="'Lista de convites'"
            :columns="columns"
            :edit="false"
            :rows="invites"
            @copy="actionCopy"
            @delete="deleteInvite"
            :loading="loading"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { copyToClipboard } from 'quasar';

import type { QTableProps } from 'quasar';

import BaseTextInput from 'src/core/components/BaseTextInput.vue';
import BaseHorizontalSeparator from 'src/core/components/BaseHorizontalSeparator.vue';
import BaseTableCopyDelete from 'src/core/components/BaseTableCopyDelete.vue';

import UserService from 'src/core/services/UserService';
import { showSuccess, showError } from 'src/core/utils/NotificationUtils';

const columns: QTableProps['columns'] = [
  {
    name: 'invite',
    label: 'Codigo do convite',
    field: 'code',
    align: 'left',
  },
  {
    name: 'actions',
    label: '',
    field: '',
    align: 'center',
  },
];
const invite = ref('');
const invites = ref<{ code: string }[]>([]);
const loading = ref(false);

onMounted(async () => {
  await loadInvites();
});

async function createInvite() {
  try {
    loading.value = true;
    const res = await UserService.createUserInvite();
    invite.value = res.code;
    await loadInvites();
    showSuccess('Convite criado');
  } catch {
    showError('Erro ao criar convite');
  } finally {
    loading.value = false;
  }
}

async function loadInvites() {
  try {
    loading.value = true;
    const res = await UserService.listUserInvites();
    invites.value = res;
  } catch {
    showError('Erro ao listar convites');
  } finally {
    loading.value = false;
  }
}

async function deleteInvite(invite: { code: string }) {
  try {
    loading.value = true;
    await UserService.deleteUserInvite(invite.code);
    removeInviteFromDate(invite.code);
    showSuccess('Convite deletado');
  } catch {
    showError('Erro ao listar convites');
  } finally {
    loading.value = false;
  }
}

async function actionCopy(invite: { code: string }) {
  if (!invite) {
    return;
  }
  await copyToClipboard(invite.code);
  showSuccess('Convite copiado');
}

function removeInviteFromDate(code: string) {
  if (!invites.value?.length) {
    return;
  }
  const invite = invites.value?.find((i) => i.code === code) as {
    code: string;
  };
  const index = invites.value?.indexOf(invite);
  if (typeof index === 'number') {
    invites.value?.splice(index, 1);
  }
}
</script>
