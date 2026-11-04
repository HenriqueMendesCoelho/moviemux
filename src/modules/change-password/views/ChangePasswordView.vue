<template>
  <main class="mm-reset-page">
    <router-link to="/" class="mm-brand">MOVIEMUX</router-link>
    <form class="mm-card mm-form" @submit.prevent="redefinePassword">
      <header>
        <p class="mm-eyebrow">{{ t('account.recover') }}</p>
        <h1>{{ t('account.newPasswordTitle') }}</h1>
      </header>
      <label class="mm-field"
        >{{ t('account.email')
        }}<input v-model.trim="email" type="email" autocomplete="email" required
      /></label>
      <BasePasswordInput
        :label="t('account.newPassword')"
        v-model="password"
        required
        autocomplete="new-password"
        minlength="8"
        maxlength="70"
      />
      <p class="mm-muted">
        {{ t('account.resetHelp') }}
      </p>
      <BasePasswordInput
        :label="t('account.confirmNewPassword')"
        v-model="confirmation"
        required
        autocomplete="new-password"
      />
      <TurnstileChallenge ref="widget" v-model="token" action="password_reset" />
      <p v-if="error" role="alert" class="mm-error">{{ error }}</p>
      <div class="mm-actions">
        <button class="mm-btn mm-btn-primary" :disabled="busy || !ready">
          {{ busy ? t('account.saving') : t('account.saveNewPassword') }}</button
        ><button class="mm-btn" type="button" :disabled="busy" @click="clear">
          {{ t('account.clear') }}</button
        ><router-link to="/" class="mm-link">{{ t('account.backHome') }}</router-link>
      </div>
    </form>
  </main>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
import TurnstileChallenge from 'src/core/components/TurnstileChallenge.vue';
import { useTurnstileForm } from 'src/core/turnstile/useTurnstileForm';
import { verificationFailureMessage } from 'src/core/turnstile/errors';
import { computed, onMounted, ref } from 'vue';
import BasePasswordInput from 'src/core/components/BasePasswordInput.vue';
import { useRoute, useRouter } from 'vue-router';
import UserService from 'src/core/services/UserService';
import { showSuccess } from 'src/core/utils/NotificationUtils';
const route = useRoute();
const router = useRouter();
const key = computed(() => route.params.key?.toString() || '');
const email = ref('');
const password = ref('');
const confirmation = ref('');
const busy = ref(false);
const { token, widget, ready, reset: resetChallenge } = useTurnstileForm();
const errorMessage = ref<() => string>(() => '');
const error = computed(() => errorMessage.value());
onMounted(async () => {
  if (key.value.length !== 200) await router.replace('/login');
});
function clear() {
  resetChallenge();
  email.value = '';
  password.value = '';
  confirmation.value = '';
  errorMessage.value = () => '';
}
async function redefinePassword() {
  if (busy.value || !ready.value) return;
  errorMessage.value = () => '';
  if (
    !/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@#$!%*?&])[A-Za-z\d@#$!%*?&]{8,70}$/.test(password.value)
  ) {
    errorMessage.value = () => t('account.passwordRequirements');
    return;
  }
  if (password.value !== confirmation.value) {
    errorMessage.value = () => t('account.passwordMismatch');
    return;
  }
  busy.value = true;
  try {
    await UserService.redefinePasswordByKey(key.value, {
      email: email.value,
      password: password.value,
      'cf-turnstile-response': token.value,
    });
    showSuccess(() => t('account.passwordChanged'));
    await router.push('/');
  } catch (err) {
    errorMessage.value = () => verificationFailureMessage(err, t) ?? t('account.resetFailed');
  } finally {
    resetChallenge();
    busy.value = false;
  }
}
</script>
<style scoped>
.mm-reset-page {
  width: min(100% - 2rem, 640px);
  margin: 4rem auto;
}
.mm-brand {
  display: block;
  margin-bottom: 2rem;
  letter-spacing: 0.2em;
  font-weight: 900;
  color: inherit;
}
.mm-card {
  padding: 2rem;
}
</style>
