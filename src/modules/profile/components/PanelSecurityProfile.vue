<template>
  <form class="mm-form mm-security-form" @submit.prevent="updatePassword">
    <h2>{{ t('account.changePassword') }}</h2>
    <p class="mm-muted">{{ t('account.securityIntro') }}</p>
    <BasePasswordInput
      :label="t('account.currentPassword')"
      v-model="currentPass"
      required
      autocomplete="current-password"
    />
    <BasePasswordInput
      :label="t('account.newPassword')"
      v-model="newPass"
      required
      autocomplete="new-password"
    />
    <BasePasswordInput
      :label="t('account.confirmNewPassword')"
      v-model="confirmNewPass"
      required
      autocomplete="new-password"
    />
    <p v-if="error" role="alert" class="mm-error">{{ error }}</p>
    <div class="mm-actions">
      <button class="mm-btn mm-btn-primary" :disabled="busy">
        {{ busy ? t('account.updating') : t('account.updatePassword') }}</button
      ><button class="mm-btn" type="button" :disabled="busy" @click="clearInputs">
        {{ t('account.cancel') }}
      </button>
    </div>
  </form>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
import { computed, ref } from 'vue';
import BasePasswordInput from 'src/core/components/BasePasswordInput.vue';
import axios from 'axios';
import UserService from 'src/core/services/UserService';
import { showSuccess } from 'src/core/utils/NotificationUtils';
const currentPass = ref('');
const newPass = ref('');
const confirmNewPass = ref('');
const busy = ref(false);
const errorMessage = ref<() => string>(() => '');
const error = computed(() => errorMessage.value());
function clearInputs() {
  currentPass.value = '';
  newPass.value = '';
  confirmNewPass.value = '';
  errorMessage.value = () => '';
}
async function updatePassword() {
  if (busy.value) return;
  errorMessage.value = () => '';
  if (newPass.value !== confirmNewPass.value) {
    errorMessage.value = () => t('account.confirmationMismatch');
    return;
  }
  busy.value = true;
  try {
    await UserService.updateUserPassword({
      password: currentPass.value,
      newPassword: newPass.value,
    });
    clearInputs();
    showSuccess(() => t('account.passwordUpdated'));
  } catch (err) {
    errorMessage.value = () =>
      axios.isAxiosError(err) &&
      err.response?.data?.message === 'user not authorized to do this action'
        ? t('account.wrongPassword')
        : t('account.passwordUpdateFailed');
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
