<template>
  <form class="mm-form" @submit.prevent="submit">
    <header>
      <p class="mm-eyebrow">{{ t('account.join') }}</p>
      <h2>{{ t('account.registrationWaitlist') }}</h2>
      <p class="mm-muted">{{ t('account.registrationWaitlistIntro') }}</p>
    </header>
    <template v-if="enabled && !accepted">
      <label class="mm-field">
        {{ t('account.email') }}
        <input
          v-model.trim="email"
          type="email"
          autocomplete="email"
          maxlength="100"
          required
          :disabled="busy"
        />
      </label>
      <TurnstileChallenge ref="widget" v-model="token" action="registration_waitlist" />
      <button class="mm-btn mm-btn-primary" :disabled="busy || !ready">
        {{ t(busy ? 'account.sending' : 'account.joinRegistrationWaitlist') }}
      </button>
    </template>
    <p v-if="accepted" role="status" aria-live="polite">
      {{ t('account.registrationWaitlistAccepted') }}
    </p>
    <p v-else-if="!enabled && !error" class="mm-muted" role="status">
      {{ t(checking ? 'account.checkingRegistrationMode' : 'account.registrationModeChanged') }}
    </p>
    <p v-if="error" role="alert" class="mm-error">{{ error }}</p>
    <button type="button" class="mm-link" :disabled="busy" @click="emit('changeTab', 'create')">
      {{ t('account.receivedInvite') }} {{ t('account.createMyAccount') }}
    </button>
    <button type="button" class="mm-link" :disabled="busy" @click="emit('changeTab', 'login')">
      {{ t('account.backLogin') }}
    </button>
  </form>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { computed, ref } from 'vue';
import axios from 'axios';
import TurnstileChallenge from '~/core/components/TurnstileChallenge.vue';
import { useTurnstileForm } from '~/core/turnstile/useTurnstileForm';
import { verificationFailureMessage } from '~/core/turnstile/errors';
import registration from '../services/RegistrationService';
const { t } = useI18n();
const props = defineProps<{ enabled: boolean; checking?: boolean }>();
const emit = defineEmits<{
  changeTab: [value: string];
  loading: [value: boolean];
  refreshMode: [];
}>();
const email = ref('');
const accepted = ref(false);
const busy = ref(false);
const errorMessage = ref<() => string>(() => '');
const error = computed(() => errorMessage.value());
const { token, widget, ready, reset: resetChallenge } = useTurnstileForm();
async function submit() {
  if (!props.enabled || busy.value || accepted.value || !ready.value) return;
  errorMessage.value = () => '';
  if (!email.value.trim() || Array.from(email.value.trim()).length > 100) {
    errorMessage.value = () => t('account.registrationWaitlistInvalid');
    return;
  }
  busy.value = true;
  emit('loading', true);
  try {
    await registration.waitlist(email.value.trim(), token.value);
    email.value = '';
    accepted.value = true;
  } catch (err) {
    if (
      axios.isAxiosError(err) &&
      err.response?.status === 409 &&
      err.response?.data?.data?.code === 'registration.mode_changed'
    ) {
      errorMessage.value = () => t('account.registrationModeChanged');
      emit('refreshMode');
    } else {
      errorMessage.value = () =>
        verificationFailureMessage(err, t) ?? t('account.registrationWaitlistFailed');
    }
  } finally {
    resetChallenge();
    busy.value = false;
    emit('loading', false);
  }
}
</script>
