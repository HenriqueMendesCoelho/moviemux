<template>
  <form class="mm-form" @submit.prevent="create">
    <header>
      <p class="mm-eyebrow">FAÇA PARTE</p>
      <h2>Sua história com o cinema.</h2>
      <p class="mm-muted">Crie sua conta usando um convite.</p>
    </header>
    <label class="mm-field"
      >E-mail<input v-model.trim="email" type="email" autocomplete="email" required
    /></label>
    <label class="mm-field"
      >Nickname<input v-model.trim="nickname" autocomplete="nickname" minlength="3" required
    /></label>
    <BasePasswordInput
      label="Senha"
      v-model="password"
      required
      autocomplete="new-password"
      minlength="8"
      maxlength="70"
      aria-describedby="password-help"
    />
    <p id="password-help" class="mm-muted">
      Use 8 a 70 caracteres, com maiúsculas, minúsculas, números e um símbolo: @ # $ ! % * ? &.
    </p>
    <BasePasswordInput
      label="Repita a senha"
      v-model="repeatPassword"
      required
      autocomplete="new-password"
    />
    <label class="mm-field"
      >Código do convite<input v-model.trim="invite" autocomplete="off" required
    /></label>
    <TurnstileChallenge ref="widget" v-model="token" action="signup" />
    <p v-if="error" role="alert" class="mm-error">{{ error }}</p>
    <button class="mm-btn mm-btn-primary" :disabled="busy || !ready">
      {{ busy ? 'Criando conta…' : 'Criar conta' }}
    </button>
    <button class="mm-link" type="button" :disabled="busy" @click="emit('changeTab', 'login')">
      Voltar para entrar
    </button>
  </form>
</template>
<script setup lang="ts">
import TurnstileChallenge from 'src/core/components/TurnstileChallenge.vue';
import { useTurnstileForm } from 'src/core/turnstile/useTurnstileForm';
import { verificationFailureMessage } from 'src/core/turnstile/errors';
import { ref } from 'vue';
import BasePasswordInput from 'src/core/components/BasePasswordInput.vue';
import axios from 'axios';
import UserService from 'src/core/services/UserService';
import { showSuccess } from 'src/core/utils/NotificationUtils';
const emit = defineEmits<{ changeTab: [value: string]; loading: [value: boolean] }>();
const email = ref('');
const password = ref('');
const repeatPassword = ref('');
const nickname = ref('');
const invite = ref('');
const error = ref('');
const busy = ref(false);
const { token, widget, ready, reset: resetChallenge } = useTurnstileForm();
async function create() {
  if (busy.value || !ready.value) return;
  error.value = '';
  if (
    !/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@#$!%*?&])[A-Za-z\d@#$!%*?&]{8,70}$/.test(password.value)
  ) {
    error.value = 'A senha precisa seguir todos os requisitos indicados.';
    return;
  }
  if (password.value !== repeatPassword.value) {
    error.value = 'As senhas precisam ser iguais.';
    return;
  }
  busy.value = true;
  emit('loading', true);
  try {
    await UserService.create({
      name: nickname.value,
      email: email.value,
      password: password.value,
      invite_code: invite.value,
      'cf-turnstile-response': token.value,
    });
    showSuccess('Conta criada. Você já pode entrar.');
    emit('changeTab', 'login');
  } catch (err) {
    error.value =
      verificationFailureMessage(err) ??
      (axios.isAxiosError(err) && err.response?.data?.message === 'invite is not valid'
        ? 'O convite é inválido.'
        : 'Não foi possível criar sua conta. Confira os dados e tente novamente.');
  } finally {
    resetChallenge();
    busy.value = false;
    emit('loading', false);
  }
}
</script>
