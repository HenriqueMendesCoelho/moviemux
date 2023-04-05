<template>
  <div class="row justify-center" :class="isMobile ? 'q-pt-xs' : 'q-pt-md'">
    <h5>Dados pessoais</h5>
    <SeparatorDivLineSolid />
    <PanelUserInfo class="col-12 q-mt-md" v-model="user" />
    <div class="row justify-center full-width">
      <div class="col-12" />
      <div :class="isMobile ? 'col-4' : 'col-2'">
        <q-btn style="width: 100%" color="positive" text-color="white" label="Salvar" @click="updateProfile" />
      </div>
      <div :class="isMobile ? 'col-4 q-ml-md' : 'col-2 q-ml-md q-mb-sm'">
        <q-btn style="width: 100%" color="red" text-color="white" label="Cancelar" @click="loadUser" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useQuasar } from 'quasar';

import User from '@/domain/user/User';

import UserService from '@/services/UserService';

import SeparatorDivLineSolid from '@/components/shared/separator/SeparatorDivLineSolid.vue';
import PanelUserInfo from '@/components/shared/panelUserInfo/PanelUserInfo.vue';

export default defineComponent({
  name: 'PanelSecurityProfile',
  components: {
    SeparatorDivLineSolid,
    PanelUserInfo,
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
      tab: 'myData',
      user: new User(),
    };
  },
  async mounted() {
    document.title = 'Cineminha - Meu Dados';
    await this.loadUser();
  },
  computed: {
    isMobile(): boolean | undefined {
      return this.$q.platform.is.mobile;
    },
  },
  methods: {
    async loadUser() {
      const res = await UserService.getUser();
      this.user = res;
    },
    async updateProfile() {
      if (!this.user.name || !this.user.email) {
        this.showError('Todos os campos devem estar preenchidos');
        return;
      }

      try {
        this.showLoading();
        const res = await UserService.updateUserProfile({
          name: this.user.name,
          email: this.user.email,
          notify: this.user.preferences.notify,
        });
        this.user = res;
        this.showSuccess('Perfil atualizado com sucesso');
      } catch {
        this.showError('Erro ao atualizar perfil');
      } finally {
        this.hideLoading();
      }
    },
  },
});
</script>
