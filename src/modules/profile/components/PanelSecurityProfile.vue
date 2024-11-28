<template>
  <div class="row q-pt-md justify-center">
    <h5>Alteração de senha</h5>
    <BaseHorizontalSeparator />
    <div class="q-mt-md col-xs-12 col-md-6">
      <BaseTextInput ref="inputTextCurrentPassRef" :label="'Senha atual'" v-model="currentPass" :type="'password'" :required="true" />
    </div>
    <div class="col-12" />
    <div class="q-mt-md col-xs-12 col-md-6">
      <BaseTextInput ref="inputTextNewPassRef" :label="'Nova Senha'" v-model="newPass" :type="'password'" :required="true" />
    </div>
    <div class="col-12" />
    <div class="q-mt-md q-mb-xl col-xs-12 col-md-6">
      <BaseTextInput
        ref="inputTextConfirmNewPassRef"
        :label="'Confirme Nova Senha'"
        v-model="confirmNewPass"
        :type="'password'"
        :customRules="() => newPass === confirmNewPass || 'Deve ser igual a nova senha'"
      />
    </div>
    <div class="col-12" />
    <div class="col-xs-4 col-md-2">
      <q-btn class="full-width" color="positive" text-color="white" label="Salvar" @click="updatePassword" />
    </div>
    <div class="col-xs-4 col-md-2 q-ml-md">
      <q-btn class="full-width" color="red" text-color="white" label="Cancelar" @click="clearInputs" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';

import UserService from 'src/core/services/UserService';

import BaseTextInput from 'src/core/components/BaseTextInput.vue';
import BaseHorizontalSeparator from 'src/core/components/BaseHorizontalSeparator.vue';
import axios, { AxiosError } from 'axios';
import { hideLoading, showLoading } from 'src/core/utils/LoadingUtils';
import { showError, showSuccess } from 'src/core/utils/NotificationUtils';

const inputTextCurrentPassRef = ref<InstanceType<typeof BaseTextInput>>();
const inputTextNewPassRef = ref<InstanceType<typeof BaseTextInput>>();
const inputTextConfirmNewPassRef = ref<InstanceType<typeof BaseTextInput>>();

const currentPass = ref('');
const newPass = ref('');
const confirmNewPass = ref('');

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
