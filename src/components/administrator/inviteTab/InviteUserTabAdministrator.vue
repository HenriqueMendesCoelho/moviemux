<template>
  <div class="row justify-center">
    <h5>Gerenciamento de convites</h5>
    <SeparatorDivLineSolid />
    <div class="col-10 q-mt-md">
      <div class="row">
        <div class="col-2">
          <q-btn style="width: 100%; height: 100%" color="info" text-color="white" label="Gerar convite" @click="createInvite" />
        </div>
        <div class="q-pl-md col-5">
          <InputText :label="'Convite gerado'" v-model="invite" :required="false" :readOnly="true" :dense="true" />
        </div>
        <div class="col-12 q-mt-md">
          <TableCopyDelete
            :title="'Lista de convites'"
            :columns="columns"
            :edit="false"
            :rows="invites"
            :actionCopy="actionCopy"
            :actionDelete="deleteInvite"
            :loading="loading"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useQuasar } from 'quasar';

import type { QTableProps } from 'quasar';

import InputText from '@/components/shared/inputText/InputText.vue';
import SeparatorDivLineSolid from '@/components/shared/separator/SeparatorDivLineSolid.vue';
import UserService from '@/services/UserService';
import TableCopyDelete from '@/components/shared/tableCopyDelete/TableCopyDelete.vue';

export default defineComponent({
  name: 'InviteUserTabAdministrator',
  components: {
    InputText,
    SeparatorDivLineSolid,
    TableCopyDelete,
  },
  setup() {
    const $q = useQuasar();
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
      invite: '',
      invites: [] as { code: string }[],
      loading: false,
    };
  },
  async mounted() {
    await this.loadInvites();
  },
  methods: {
    async createInvite() {
      try {
        this.loading = true;
        const res = await UserService.createUserInvite();
        this.invite = res.code;
        await this.loadInvites();
        this.showSuccess('Convite criado');
      } catch {
        this.showError('Erro ao criar convite');
      } finally {
        this.loading = false;
      }
    },
    async loadInvites() {
      try {
        this.loading = true;
        const res = await UserService.listUserInvites();
        this.invites = res;
      } catch {
        this.showError('Erro ao listar convites');
      } finally {
        this.loading = false;
      }
    },
    async deleteInvite(invite: { code: string }) {
      try {
        this.loading = true;
        await UserService.deleteUserInvite(invite.code);
        this.removeInviteFromDate(invite.code);
        this.showSuccess('Convite deletado');
      } catch {
        this.showError('Erro ao listar convites');
      } finally {
        this.loading = false;
      }
    },
    actionCopy(invite: { code: string }) {
      if (!invite) {
        return;
      }
      navigator.clipboard.writeText(invite.code);
      this.showSuccess('Convite copiado');
    },
    removeInviteFromDate(code: string) {
      if (!this.invites?.length) {
        return;
      }
      const invite = this.invites?.find((i) => i.code === code) as { code: string };
      const index = this.invites?.indexOf(invite);
      if (typeof index === 'number') {
        this.invites?.splice(index, 1);
      }
    },
  },
});
</script>
