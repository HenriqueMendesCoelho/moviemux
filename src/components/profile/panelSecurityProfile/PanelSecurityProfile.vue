<template>
  <div class="row q-pt-md justify-center">
    <h5>Alteração de senha</h5>
    <SeparatorDivLineSolid />
    <div class="q-mt-md" :class="isMobile ? 'col-12' : 'col-6'">
      <InputText ref="inputTextCurrentPassRef" :label="'Senha atual'" v-model="currentPass" :type="'password'" :required="true" />
    </div>
    <div class="col-12" />
    <div class="q-mt-md" :class="isMobile ? 'col-12' : 'col-6'">
      <InputText ref="inputTextNewPassRef" :label="'Nova Senha'" v-model="newPass" :type="'password'" :required="true" />
    </div>
    <div class="col-12" />
    <div class="q-mt-md q-mb-xl" :class="isMobile ? 'col-12' : 'col-6'">
      <InputText
        ref="inputTextConfirmNewPassRef"
        :label="'Confirme Nova Senha'"
        v-model="confirmNewPass"
        :type="'password'"
        :customRules="newPass === confirmNewPass"
        :customRulesText="'Deve ser igual a nova senha'"
      />
    </div>
    <div class="col-12" />
    <div :class="isMobile ? 'col-4' : 'col-2'">
      <q-btn style="width: 100%" color="positive" text-color="white" label="Salvar" @click="updatePassword" />
    </div>
    <div :class="isMobile ? 'col-4 q-ml-md' : 'col-2 q-ml-md q-mb-sm'">
      <q-btn style="width: 100%" color="red" text-color="white" label="Cancelar" @click="clearInputs" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useQuasar } from 'quasar';

import { InputTextRefType } from '@/components/shared/inputText/types/InputValidateRefType';
import UserService from '@/services/UserService';

import InputText from '@/components/shared/inputText/InputText.vue';
import SeparatorDivLineSolid from '@/components/shared/separator/SeparatorDivLineSolid.vue';
import axios, { AxiosError } from 'axios';

export default defineComponent({
  name: 'PanelSecurityProfile',
  components: {
    InputText,
    SeparatorDivLineSolid,
  },
  setup() {
    const $q = useQuasar();

    const inputTextCurrentPassRef = ref<InputTextRefType>();
    const inputTextNewPassRef = ref<InputTextRefType>();
    const inputTextConfirmNewPassRef = ref<InputTextRefType>();
    return {
      inputTextCurrentPassRef,
      inputTextNewPassRef,
      inputTextConfirmNewPassRef,
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
      currentPass: '',
      newPass: '',
      confirmNewPass: '',
    };
  },
  computed: {
    isMobile(): boolean | undefined {
      return this.$q.platform.is.mobile;
    },
  },
  mounted() {
    document.title = 'Cineminha - Segurança';
  },
  methods: {
    async updatePassword() {
      if (this.hasErrors()) {
        return;
      }
      try {
        this.showLoading();
        await UserService.updateUserPassword({
          password: this.currentPass,
          newPassword: this.newPass,
        });
        this.showSuccess('Senha atualizada com sucesso');
        this.clearInputs();
      } catch (err) {
        const error = err as Error | AxiosError;
        if (axios.isAxiosError(error)) {
          if (error.response?.data.message === 'user not authorized to do this action') {
            this.showError('Senha incorreta');
          }
        } else {
          this.showError('Erro ao atualizar senha');
        }
      } finally {
        this.hideLoading();
      }
    },
    clearInputs() {
      this.currentPass = '';
      this.newPass = '';
      this.confirmNewPass = '';
    },
    hasErrors(): boolean {
      let hasError = false;
      if (this.inputTextCurrentPassRef) {
        hasError = this.inputTextCurrentPassRef.hasErrors();
      }
      if (this.inputTextNewPassRef) {
        hasError = this.inputTextNewPassRef.hasErrors();
      }
      if (this.inputTextConfirmNewPassRef) {
        hasError = this.inputTextConfirmNewPassRef.hasErrors();
      }
      return hasError;
    },
  },
});
</script>
