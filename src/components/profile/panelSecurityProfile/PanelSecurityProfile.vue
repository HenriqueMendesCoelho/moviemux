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

<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useQuasar } from 'quasar';

import { InputTextRefType } from 'src/components/shared/inputText/types/InputValidateRefType';
import UserService from 'src/services/UserService';

import InputText from 'src/components/shared/inputText/InputText.vue';
import SeparatorDivLineSolid from 'src/components/shared/separator/SeparatorDivLineSolid.vue';
import axios, { AxiosError } from 'axios';

const $q = useQuasar();
const inputTextCurrentPassRef = ref<InputTextRefType>();
const inputTextNewPassRef = ref<InputTextRefType>();
const inputTextConfirmNewPassRef = ref<InputTextRefType>();

const currentPass = ref('');
const newPass = ref('');
const confirmNewPass = ref('');

const isMobile = computed(() => $q.platform.is.mobile);

function showLoading() {
  $q.loading.show({
    spinnerColor: 'kb-primary',
  });
}
function hideLoading() {
  $q.loading.hide();
}
function showSuccess(msg: string) {
  $q.notify({
    type: 'positive',
    message: msg,
    position: 'top',
  });
}
function showError(msg: string) {
  $q.notify({
    type: 'negative',
    message: msg,
    position: 'top',
  });
}

async function updatePassword() {
  if (await hasErrors()) {
    return;
  }
  try {
    showLoading();
    await UserService.updateUserPassword({
      password: currentPass.value,
      newPassword: newPass.value,
    });
    showSuccess('Senha atualizada com sucesso');
    clearInputs();
  } catch (err) {
    const error = err as Error | AxiosError;
    if (axios.isAxiosError(error)) {
      if (error.response?.data.message === 'user not authorized to do this action') {
        showError('Senha incorreta');
      }
    } else {
      showError('Erro ao atualizar senha');
    }
  } finally {
    hideLoading();
  }
}
function clearInputs() {
  currentPass.value = '';
  newPass.value = '';
  confirmNewPass.value = '';
}

async function hasErrors(): Promise<boolean> {
  let hasError = false;
  if (inputTextCurrentPassRef.value) {
    hasError = await inputTextCurrentPassRef.value.hasErrors();
  }
  if (inputTextNewPassRef.value) {
    hasError = await inputTextNewPassRef.value.hasErrors();
  }
  if (inputTextConfirmNewPassRef.value) {
    hasError = await inputTextConfirmNewPassRef.value.hasErrors();
  }
  return Promise.resolve(hasError);
}
</script>
