<template>
  <form class="mm-form" @submit.prevent="create">
    <header>
      <p class="mm-eyebrow">{{ t('account.join') }}</p>
      <h2>{{ t('account.signupTitle') }}</h2>
      <p class="mm-muted">
        {{ t(openSignup ? 'account.openSignupIntro' : 'account.signupIntro') }}
      </p>
    </header>
    <label class="mm-field"
      >{{ t('account.email')
      }}<input v-model.trim="email" type="email" autocomplete="email" required
    /></label>
    <label class="mm-field"
      >{{ t('account.nickname')
      }}<input v-model.trim="nickname" autocomplete="nickname" minlength="3" required
    /></label>
    <BasePasswordInput
      :label="t('account.password')"
      v-model="password"
      required
      autocomplete="new-password"
      minlength="8"
      maxlength="70"
      aria-describedby="password-help"
    />
    <p id="password-help" class="mm-muted">
      {{ t('account.passwordHelp') }}
    </p>
    <BasePasswordInput
      :label="t('account.repeatPassword')"
      v-model="repeatPassword"
      required
      autocomplete="new-password"
    />
    <label class="mm-field"
      >{{ t(openSignup ? 'account.inviteCodeOptional' : 'account.inviteCode')
      }}<input v-model.trim="invite" autocomplete="off" :required="!openSignup"
    /></label>
    <TurnstileChallenge ref="widget" v-model="token" action="signup" />
    <p v-if="error" role="alert" class="mm-error">{{ error }}</p>
    <button class="mm-btn mm-btn-primary" :disabled="busy || !ready">
      {{ busy ? t('account.creating') : t('account.createAccount') }}
    </button>
    <button class="mm-link" type="button" :disabled="busy" @click="emit('changeTab', 'login')">
      {{ t('account.backLogin') }}
    </button>
  </form>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
import TurnstileChallenge from 'src/core/components/TurnstileChallenge.vue';
import { useTurnstileForm } from 'src/core/turnstile/useTurnstileForm';
import { verificationFailureMessage } from 'src/core/turnstile/errors';
import { computed, ref } from 'vue';
import BasePasswordInput from 'src/core/components/BasePasswordInput.vue';
import axios from 'axios';
import UserService from 'src/core/services/UserService';
import { showSuccess } from 'src/core/utils/NotificationUtils';
import type { RegistrationMode } from '~/core/registration-mode';
const props = defineProps<{ registrationMode?: RegistrationMode | null }>();
const openSignup = computed(() => props.registrationMode === 'OPEN');
const emit = defineEmits<{
  changeTab: [value: string];
  loading: [value: boolean];
  refreshMode: [];
}>();
const email = ref('');
const password = ref('');
const repeatPassword = ref('');
const nickname = ref('');
const invite = ref('');
const errorMessage = ref<() => string>(() => '');
const error = computed(() => errorMessage.value());
const busy = ref(false);
const { token, widget, ready, reset: resetChallenge } = useTurnstileForm();
async function create() {
  if (busy.value || !ready.value) return;
  errorMessage.value = () => '';
  if (
    !/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@#$!%*?&])[A-Za-z\d@#$!%*?&]{8,70}$/.test(password.value)
  ) {
    errorMessage.value = () => t('account.passwordRequirements');
    return;
  }
  if (password.value !== repeatPassword.value) {
    errorMessage.value = () => t('account.passwordMismatch');
    return;
  }
  const suppliedInvite = invite.value.trim();
  if (!openSignup.value && !suppliedInvite) {
    errorMessage.value = () => t('account.inviteRequired');
    return;
  }
  busy.value = true;
  emit('loading', true);
  try {
    await UserService.create({
      name: nickname.value,
      email: email.value,
      password: password.value,
      ...(suppliedInvite ? { invite_code: suppliedInvite } : {}),
      'cf-turnstile-response': token.value,
    });
    showSuccess(() => t('account.accountCreated'));
    emit('changeTab', 'login');
  } catch (err) {
    if (
      axios.isAxiosError(err) &&
      err.response?.status === 400 &&
      err.response?.data?.data?.code === 'registration.invite_required'
    ) {
      errorMessage.value = () =>
        t(suppliedInvite ? 'account.invalidInvite' : 'account.registrationModeChanged');
      emit('refreshMode');
      return;
    }
    errorMessage.value = () =>
      verificationFailureMessage(err, t) ??
      (axios.isAxiosError(err) && err.response?.data?.message === 'invite is not valid'
        ? t('account.invalidInvite')
        : t('account.createFailed'));
  } finally {
    resetChallenge();
    busy.value = false;
    emit('loading', false);
  }
}
</script>
