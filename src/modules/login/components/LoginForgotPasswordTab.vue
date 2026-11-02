<template>
  <form class="mm-form" @submit.prevent="sendEmail">
    <header>
      <p class="mm-eyebrow">RECUPERAR ACESSO</p>
      <h2>Vamos te trazer de volta.</h2>
      <p class="mm-muted">Informe seu e-mail para receber as instruções de recuperação.</p>
    </header>
    <label class="mm-field"
      >E-mail<input v-model.trim="email" type="email" autocomplete="email" required
    /></label>
    <TurnstileChallenge ref="widget" v-model="token" action="password_recovery" />
    <p v-if="error" role="alert" class="mm-error">{{ error }}</p>
    <button class="mm-btn mm-btn-primary" :disabled="busy || !ready">
      {{ busy ? 'Enviando…' : 'Enviar instruções' }}
    </button>
    <button type="button" class="mm-link" :disabled="busy" @click="emit('changeTab', 'login')">
      Voltar para entrar
    </button>
    <button
      v-if="createAccount"
      type="button"
      class="mm-link"
      :disabled="busy"
      @click="emit('changeTab', 'create')"
    >
      Criar uma conta
    </button>
  </form>
</template>
<script setup lang="ts">
import TurnstileChallenge from 'src/core/components/TurnstileChallenge.vue';
import { useTurnstileForm } from 'src/core/turnstile/useTurnstileForm';
import { verificationFailureMessage } from 'src/core/turnstile/errors';
import { ref } from 'vue';
import UserService from 'src/core/services/UserService';
import { showSuccess } from 'src/core/utils/NotificationUtils';
withDefaults(defineProps<{ createAccount?: boolean }>(), { createAccount: true });
const emit = defineEmits<{ changeTab: [value: string]; loading: [value: boolean] }>();
const email = ref('');
const busy = ref(false);
const { token, widget, ready, reset: resetChallenge } = useTurnstileForm();
const error = ref('');
async function sendEmail() {
  if (busy.value || !ready.value) return;
  busy.value = true;
  error.value = '';
  emit('loading', true);
  try {
    await UserService.createRedefinePassowordKey(email.value, token.value);
    showSuccess('Instruções de recuperação enviadas.');
    emit('changeTab', 'login');
  } catch (err) {
    error.value =
      verificationFailureMessage(err) ?? 'Não foi possível enviar as instruções. Tente novamente.';
  } finally {
    resetChallenge();
    busy.value = false;
    emit('loading', false);
  }
}
</script>
