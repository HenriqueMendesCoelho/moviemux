<template>
  <form class="mm-form" @submit.prevent="login">
    <header>
      <p class="mm-eyebrow">SUA PRÓXIMA SESSÃO COMEÇA AQUI</p>
      <h2>Bom ter você de volta.</h2>
      <p class="mm-muted">Entre para descobrir, avaliar e compartilhar filmes.</p>
    </header>
    <label class="mm-field"
      >E-mail<input v-model.trim="email" type="email" autocomplete="username" required
    /></label>
    <BasePasswordInput v-model="password" autocomplete="current-password" required />
    <button type="button" class="mm-link" :disabled="busy" @click="emit('changeTab', 'forgot')">
      Esqueci minha senha
    </button>
    <TurnstileChallenge ref="widget" v-model="token" action="login" />
    <p v-if="error" role="alert" class="mm-error">{{ error }}</p>
    <button class="mm-btn mm-btn-primary" :disabled="busy || !ready">
      {{ busy ? 'Entrando…' : 'Entrar no Movie Mux' }}
    </button>
    <p v-if="createAccount" class="mm-muted">
      Recebeu um convite?
      <button type="button" class="mm-link" :disabled="busy" @click="emit('changeTab', 'create')">
        Criar minha conta
      </button>
    </p>
  </form>
</template>
<script setup lang="ts">
import BasePasswordInput from 'src/core/components/BasePasswordInput.vue';
import TurnstileChallenge from 'src/core/components/TurnstileChallenge.vue';
import { useTurnstileForm } from 'src/core/turnstile/useTurnstileForm';
import { verificationFailureMessage } from 'src/core/turnstile/errors';
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { safeReturnPath } from '../utils/AccountUtils';
import { useUserStore } from 'src/core/stores/UserStore';
withDefaults(defineProps<{ createAccount?: boolean }>(), { createAccount: true });
const emit = defineEmits<{ changeTab: [value: string]; loading: [value: boolean] }>();
const route = useRoute();
const router = useRouter();
const store = useUserStore();
const email = ref('');
const password = ref('');
const busy = ref(false);
const { token, widget, ready, reset: resetChallenge } = useTurnstileForm();
const error = ref('');
async function login() {
  if (busy.value || !ready.value) return;
  busy.value = true;
  error.value = '';
  emit('loading', true);
  try {
    await store.login({
      email: email.value,
      password: password.value,
      'cf-turnstile-response': token.value,
    });
    if (route.name === 'login' || route.path === '/') {
      await router.push(safeReturnPath(route.query.from));
    } else {
      // Rebuild request-scoped data, socket authentication and route permissions.
      // This preserves the original session-reauthentication behavior.
      window.location.reload();
    }
  } catch (err) {
    error.value =
      verificationFailureMessage(err) ??
      'Não foi possível entrar. Confira suas credenciais e tente novamente.';
  } finally {
    resetChallenge();
    busy.value = false;
    emit('loading', false);
  }
}
</script>
