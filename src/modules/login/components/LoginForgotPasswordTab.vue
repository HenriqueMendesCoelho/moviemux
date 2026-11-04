<template>
  <form class="mm-form" @submit.prevent="sendEmail">
    <header>
      <p class="mm-eyebrow">{{ t('account.recover') }}</p>
      <h2>{{ t('account.recoverTitle') }}</h2>
      <p class="mm-muted">{{ t('account.recoverIntro') }}</p>
    </header>
    <label class="mm-field"
      >{{ t('account.email')
      }}<input v-model.trim="email" type="email" autocomplete="email" required
    /></label>
    <TurnstileChallenge ref="widget" v-model="token" action="password_recovery" />
    <p v-if="error" role="alert" class="mm-error">{{ error }}</p>
    <button class="mm-btn mm-btn-primary" :disabled="busy || !ready">
      {{ busy ? t('account.sending') : t('account.sendInstructions') }}
    </button>
    <button type="button" class="mm-link" :disabled="busy" @click="emit('changeTab', 'login')">
      {{ t('account.backLogin') }}
    </button>
    <button
      v-if="createAccount"
      type="button"
      class="mm-link"
      :disabled="busy"
      @click="emit('changeTab', 'create')"
    >
      {{ t('account.createAnAccount') }}
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
import UserService from 'src/core/services/UserService';
import { showSuccess } from 'src/core/utils/NotificationUtils';
withDefaults(defineProps<{ createAccount?: boolean }>(), { createAccount: true });
const emit = defineEmits<{ changeTab: [value: string]; loading: [value: boolean] }>();
const email = ref('');
const busy = ref(false);
const { token, widget, ready, reset: resetChallenge } = useTurnstileForm();
const errorMessage = ref<() => string>(() => '');
const error = computed(() => errorMessage.value());
async function sendEmail() {
  if (busy.value || !ready.value) return;
  busy.value = true;
  errorMessage.value = () => '';
  emit('loading', true);
  try {
    await UserService.createRedefinePassowordKey(email.value, token.value);
    showSuccess(() => t('account.instructionsSent'));
    emit('changeTab', 'login');
  } catch (err) {
    errorMessage.value = () =>
      verificationFailureMessage(err, t) ?? t('account.instructionsFailed');
  } finally {
    resetChallenge();
    busy.value = false;
    emit('loading', false);
  }
}
</script>
