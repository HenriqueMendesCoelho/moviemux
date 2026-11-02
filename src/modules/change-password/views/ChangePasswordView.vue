<template>
  <main class="mm-reset-page">
    <router-link to="/" class="mm-brand">MOVIEMUX</router-link>
    <form class="mm-card mm-form" @submit.prevent="redefinePassword">
      <header>
        <p class="mm-eyebrow">RECUPERAR ACESSO</p>
        <h1>Uma nova senha.</h1>
      </header>
      <label class="mm-field"
        >E-mail<input v-model.trim="email" type="email" autocomplete="email" required
      /></label>
      <BasePasswordInput
        label="Nova senha"
        v-model="password"
        required
        autocomplete="new-password"
        minlength="8"
        maxlength="70"
      />
      <p class="mm-muted">
        Use 8 a 70 caracteres, maiúsculas, minúsculas, números e um símbolo (@ # $ ! % * ? &).
      </p>
      <BasePasswordInput
        label="Confirme a nova senha"
        v-model="confirmation"
        required
        autocomplete="new-password"
      />
      <p v-if="error" role="alert" class="mm-error">{{ error }}</p>
      <div class="mm-actions">
        <button class="mm-btn mm-btn-primary" :disabled="busy">
          {{ busy ? 'Salvando…' : 'Salvar nova senha' }}</button
        ><button class="mm-btn" type="button" :disabled="busy" @click="clear">Limpar</button
        ><router-link to="/" class="mm-link">Voltar ao início</router-link>
      </div>
    </form>
  </main>
</template>
<script setup lang="ts">
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
const error = ref('');
onMounted(async () => {
  if (key.value.length !== 200) await router.replace('/login');
});
function clear() {
  email.value = '';
  password.value = '';
  confirmation.value = '';
  error.value = '';
}
async function redefinePassword() {
  if (busy.value) return;
  error.value = '';
  if (
    !/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@#$!%*?&])[A-Za-z\d@#$!%*?&]{8,70}$/.test(password.value)
  ) {
    error.value = 'A senha precisa seguir todos os requisitos indicados.';
    return;
  }
  if (password.value !== confirmation.value) {
    error.value = 'As senhas precisam ser iguais.';
    return;
  }
  busy.value = true;
  try {
    await UserService.redefinePasswordByKey(key.value, {
      email: email.value,
      password: password.value,
    });
    showSuccess('Senha alterada. Entre com sua nova senha.');
    await router.push('/');
  } catch {
    error.value =
      'Não foi possível redefinir a senha. Confira o link de recuperação ou solicite outro.';
  } finally {
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
