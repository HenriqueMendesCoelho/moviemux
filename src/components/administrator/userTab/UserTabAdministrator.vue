<template>
  <div class="row justify-center q-gutter-y-md">
    <h5>Gerenciamento do usuário</h5>
    <SeparatorDivLineSolid />
    <div class="col-10 row q-mt-md">
      <InputText class="col-10 q-pr-sm" :label="'E-mail usuário alvo'" v-model="email" :required="false" :dense="true" />
      <q-btn-dropdown
        icon="settings"
        class="col-2 q-pl-sm"
        color="kb-primary"
        label="Ações"
        content-style="background-color: #343c4c; color: white"
      >
        <q-list>
          <q-item clickable v-close-popup @click="searchUser">
            <q-item-section>
              <q-item-label>Buscar usuário</q-item-label>
            </q-item-section>
          </q-item>

          <q-item clickable v-close-popup @click="promoteUser">
            <q-item-section>
              <q-item-label>Promover Usuário</q-item-label>
            </q-item-section>
          </q-item>

          <q-item clickable v-close-popup @click="demoteUser">
            <q-item-section>
              <q-item-label>Rebaixar usuário</q-item-label>
            </q-item-section>
          </q-item>

          <q-item clickable v-close-popup @click="blockUser">
            <q-item-section>
              <q-item-label>Bloquear usuário</q-item-label>
            </q-item-section>
          </q-item>

          <q-item clickable v-close-popup @click="deleteUser">
            <q-item-section>
              <q-item-label>Deletar usuário</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-btn-dropdown>
    </div>
    <div class="col-10 q-pt-xl">
      <PanelUserInfo v-model="user" :allReadOnly="true" :showAdmInfo="true" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import PanelUserInfo from '@/components/shared/panelUserInfo/PanelUserInfo.vue';
import InputText from '@/components/shared/inputText/InputText.vue';
import SeparatorDivLineSolid from '@/components/shared/separator/SeparatorDivLineSolid.vue';
import User from '@/domain/user/User';
import UserService from '@/services/UserService';

export default defineComponent({
  name: 'UserTabAdministrator',
  components: {
    PanelUserInfo,
    InputText,
    SeparatorDivLineSolid,
  },
  data() {
    return {
      email: '',
      pass: '',
      user: {} as User,
    };
  },
  methods: {
    async searchUser() {
      if (!this.email) {
        return;
      }

      const res = await UserService.getUserAdm(this.email);
      this.user = res;
    },
    promoteUser() {
      return;
    },
    demoteUser() {
      return;
    },
    blockUser() {
      return;
    },
    deleteUser() {
      return;
    },
  },
});
</script>
