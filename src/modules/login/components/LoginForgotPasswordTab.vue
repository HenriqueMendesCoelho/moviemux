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
    <p v-if="error" role="alert" class="mm-error">{{ error }}</p>
    <button class="mm-btn mm-btn-primary" :disabled="busy">
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
import { ref } from 'vue';
import UserService from 'src/core/services/UserService';
import { showSuccess } from 'src/core/utils/NotificationUtils';
withDefaults(defineProps<{ createAccount?: boolean }>(), { createAccount: true });
const emit = defineEmits<{ changeTab: [value: string]; loading: [value: boolean] }>();
const email = ref('');
const busy = ref(false);
const error = ref('');
async function sendEmail() {
  if (busy.value) return;
  busy.value = true;
  error.value = '';
  emit('loading', true);
  try {
    await UserService.createRedefinePassowordKey(email.value);
    showSuccess('Instruções de recuperação enviadas.');
    emit('changeTab', 'login');
  } catch {
    error.value = 'Não foi possível enviar as instruções. Tente novamente.';
  } finally {
    busy.value = false;
    emit('loading', false);
  }
}
</script>
