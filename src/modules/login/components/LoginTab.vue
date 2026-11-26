<template>
  <form class="mm-form" @submit.prevent="login">
    <header>
      <p class="mm-eyebrow">{{ t('account.loginEyebrow') }}</p>
      <h2>{{ t('account.welcomeBack') }}</h2>
      <p class="mm-muted">{{ t('account.loginIntro') }}</p>
    </header>
    <label class="mm-field"
      >{{ t('account.email')
      }}<input v-model.trim="email" type="email" autocomplete="username" required
    /></label>
    <BasePasswordInput v-model="password" autocomplete="current-password" required />
    <button type="button" class="mm-link" :disabled="busy" @click="emit('changeTab', 'forgot')">
      {{ t('account.forgotPassword') }}
    </button>
    <TurnstileChallenge ref="widget" v-model="token" action="login" />
    <p v-if="error" role="alert" class="mm-error">{{ error }}</p>
    <button class="mm-btn mm-btn-primary" :disabled="busy || !ready">
      {{ busy ? t('account.signingIn') : t('account.signIn') }}
    </button>
    <template v-if="createAccount">
      <button
        v-if="registrationMode === 'WAITLIST'"
        type="button"
        class="mm-btn"
        :disabled="busy"
        @click="emit('changeTab', 'waitlist')"
      >
        {{ t('account.joinRegistrationWaitlist') }}
      </button>
      <p class="mm-muted">
        {{ t(registrationMode === 'OPEN' ? 'account.noAccountYet' : 'account.receivedInvite') }}
        <button type="button" class="mm-link" :disabled="busy" @click="emit('changeTab', 'create')">
          {{ t('account.createMyAccount') }}
        </button>
      </p>
    </template>
  </form>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
import BasePasswordInput from 'src/core/components/BasePasswordInput.vue';
import TurnstileChallenge from 'src/core/components/TurnstileChallenge.vue';
import { useTurnstileForm } from 'src/core/turnstile/useTurnstileForm';
import { verificationFailureMessage } from 'src/core/turnstile/errors';
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { safeReturnPath } from '../utils/AccountUtils';
import { useLegacyBoardAvailable } from '~/core/useLegacyBoardAvailable';
import { useUserStore } from 'src/core/stores/UserStore';
import type { RegistrationMode } from '~/core/registration-mode';
withDefaults(
  defineProps<{ createAccount?: boolean; registrationMode?: RegistrationMode | null }>(),
  { createAccount: true },
);
const emit = defineEmits<{ changeTab: [value: string]; loading: [value: boolean] }>();
const route = useRoute();
const router = useRouter();
const store = useUserStore();
const legacyBoardAvailable = useLegacyBoardAvailable();
const email = ref('');
const password = ref('');
const busy = ref(false);
const { token, widget, ready, reset: resetChallenge } = useTurnstileForm();
const errorMessage = ref<() => string>(() => '');
const error = computed(() => errorMessage.value());
async function login() {
  if (busy.value || !ready.value) return;
  busy.value = true;
  errorMessage.value = () => '';
  emit('loading', true);
  try {
    await store.login({
      email: email.value,
      password: password.value,
      'cf-turnstile-response': token.value,
    });
    if (route.name === 'login' || route.path === '/') {
      await router.push(safeReturnPath(route.query.from, legacyBoardAvailable));
    } else {
      // Rebuild request-scoped data, socket authentication and route permissions.
      // This preserves the original session-reauthentication behavior.
      window.location.reload();
    }
  } catch (err) {
    errorMessage.value = () => verificationFailureMessage(err, t) ?? t('account.loginFailed');
  } finally {
    resetChallenge();
    busy.value = false;
    emit('loading', false);
  }
}
</script>
