<template>
  <form class="mm-form mm-security-form" @submit.prevent="updatePassword">
    <h2>Alterar senha</h2>
    <p class="mm-muted">Escolha uma senha forte que você não usa em outros serviços.</p>
    <BasePasswordInput
      label="Senha atual"
      v-model="currentPass"
      required
      autocomplete="current-password"
    />
    <BasePasswordInput label="Nova senha" v-model="newPass" required autocomplete="new-password" />
    <BasePasswordInput
      label="Confirme a nova senha"
      v-model="confirmNewPass"
      required
      autocomplete="new-password"
    />
    <p v-if="error" role="alert" class="mm-error">{{ error }}</p>
    <div class="mm-actions">
      <button class="mm-btn mm-btn-primary" :disabled="busy">
        {{ busy ? 'Atualizando…' : 'Atualizar senha' }}</button
      ><button class="mm-btn" type="button" :disabled="busy" @click="clearInputs">Cancelar</button>
    </div>
  </form>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import BasePasswordInput from 'src/core/components/BasePasswordInput.vue';
import axios from 'axios';
import UserService from 'src/core/services/UserService';
import { showSuccess } from 'src/core/utils/NotificationUtils';
const currentPass = ref('');
const newPass = ref('');
const confirmNewPass = ref('');
const busy = ref(false);
const error = ref('');
function clearInputs() {
  currentPass.value = '';
  newPass.value = '';
  confirmNewPass.value = '';
  error.value = '';
}
async function updatePassword() {
  if (busy.value) return;
  error.value = '';
  if (newPass.value !== confirmNewPass.value) {
    error.value = 'A confirmação precisa ser igual à nova senha.';
    return;
  }
  busy.value = true;
  try {
    await UserService.updateUserPassword({
      password: currentPass.value,
      newPassword: newPass.value,
    });
    clearInputs();
    showSuccess('Senha atualizada com sucesso.');
  } catch (err) {
    error.value =
      axios.isAxiosError(err) &&
      err.response?.data?.message === 'user not authorized to do this action'
        ? 'A senha atual está incorreta.'
        : 'Não foi possível atualizar sua senha.';
  } finally {
    busy.value = false;
  }
}
</script>
<style scoped>
.mm-security-form {
  max-width: 600px;
}
</style>
