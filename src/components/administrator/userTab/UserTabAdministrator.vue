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
          <q-item clickable v-close-popup @click="searchUser()">
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
import { useQuasar } from 'quasar';

import User from '@/domain/user/User';
import UserService from '@/services/UserService';

import PanelUserInfo from '@/components/shared/panelUserInfo/PanelUserInfo.vue';
import InputText from '@/components/shared/inputText/InputText.vue';
import SeparatorDivLineSolid from '@/components/shared/separator/SeparatorDivLineSolid.vue';
import { mapState } from 'pinia';
import { useUserStore } from '@/stores/UserStore';

export default defineComponent({
  name: 'UserTabAdministrator',
  components: {
    PanelUserInfo,
    InputText,
    SeparatorDivLineSolid,
  },
  setup() {
    const $q = useQuasar();
    return {
      showLoading() {
        $q.loading.show({
          spinnerColor: 'kb-primary',
        });
      },
      hideLoading() {
        $q.loading.hide();
      },
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
      email: '',
      pass: '',
      user: new User(),
    };
  },
  computed: {
    ...mapState(useUserStore, {
      userStore: 'user',
    }),
  },
  methods: {
    async searchUser(showSuccessMessage = true) {
      if (!this.email) {
        this.showError('É necessário preencher o e-mail do usuario alvo');
        return;
      }

      try {
        this.showLoading();
        const res = await UserService.getUserAdm(this.email);
        this.user = res;
        if (showSuccessMessage) {
          this.showSuccess('Usuario encontrado com sucesso');
        }
      } catch {
        this.showError('Erro ao buscar usuario');
      } finally {
        this.hideLoading();
      }
    },
    async promoteUser() {
      if (!this.isUserLoaded() || this.isUserMyself()) {
        return;
      }
      try {
        this.showLoading();
        const res = await UserService.promoteUser(this.user.id);
        this.user = res;
        this.showSuccess('Usuario promovido');
      } catch {
        this.showError('Erro ao promover usuario');
      } finally {
        this.hideLoading();
      }
    },
    async demoteUser() {
      if (!this.isUserLoaded() || this.isUserMyself()) {
        return;
      }
      try {
        this.showLoading();
        const res = await UserService.demoteUser(this.user.id);
        this.user = res;
        this.showSuccess('Usuario rebaixado');
      } catch {
        this.showError('Erro ao rebaixar usuario');
      } finally {
        this.hideLoading();
      }
    },
    async blockUser() {
      if (!this.isUserLoaded() || this.isUserMyself()) {
        return;
      }
      try {
        this.showLoading();
        const res = await UserService.blockUser(this.user.id);
        this.user = res;
        this.showSuccess('Usuario bloqueado');
      } catch {
        this.showError('Erro ao bloqueado usuario');
      } finally {
        this.hideLoading();
      }
    },
    async deleteUser() {
      if (!this.isUserLoaded() || this.isUserMyself()) {
        return;
      }
      try {
        this.showLoading();
        const res = await UserService.deleteUser(this.user.id);
        this.user = res;
        this.showSuccess('Usuario deletado');
      } catch {
        this.showError('Erro ao deletar usuario');
      } finally {
        this.hideLoading();
      }
    },
    isUserLoaded() {
      if (!this.email) {
        this.showError('É necessário preencher o e-mail do usuario alvo');
        return false;
      }
      if (!this.user.id) {
        this.searchUser(false);
      }

      return !!this.user.id;
    },
    isUserMyself() {
      if (!this.user.id) {
        return false;
      }

      if (this.user.id === this.userStore.id) {
        this.showError('Você não pode executar uma ação no seu próprio usuario');
        return true;
      }

      return false;
    },
  },
});
</script>
