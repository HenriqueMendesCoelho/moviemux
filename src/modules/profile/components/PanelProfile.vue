<template>
  <form class="mm-form" :aria-busy="busy" @submit.prevent="updateProfile">
    <h2>Dados pessoais</h2>
    <p class="mm-muted">Atualize seu nome, e-mail e preferências de notificação.</p>
    <p v-if="error" class="mm-error" role="alert">{{ error }}</p>
    <BaseUserInfoPanel v-if="loaded" v-model="user" />
    <ProfileLoadingState v-else-if="!error" />
    <div class="mm-actions">
      <button class="mm-btn mm-btn-primary" :disabled="busy || !loaded">
        {{ busy ? 'Aguarde…' : 'Salvar alterações' }}</button
      ><button
        v-if="loaded || error"
        type="button"
        class="mm-btn"
        :disabled="busy"
        @click="loadUser"
      >
        {{ loaded ? 'Descartar alterações' : 'Tentar novamente' }}
      </button>
    </div>
  </form>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import ProfileLoadingState from './ProfileLoadingState.vue';
import User from 'src/core/domain/user/User';
import BaseUserInfoPanel from 'src/core/components/BaseUserInfoPanel.vue';
import UserService from 'src/core/services/UserService';
import { showSuccess } from 'src/core/utils/NotificationUtils';
const user = ref(new User());
const busy = ref(false);
const error = ref('');
const loaded = ref(false);
onMounted(loadUser);
async function loadUser() {
  if (busy.value) return;
  busy.value = true;
  error.value = '';
  try {
    user.value = await UserService.getUser();
    loaded.value = true;
  } catch {
    error.value = 'Não foi possível carregar seu perfil.';
  } finally {
    busy.value = false;
  }
}
async function updateProfile() {
  if (busy.value || !loaded.value) return;
  if (!user.value.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.value.email)) {
    error.value = 'Preencha seu nome e um e-mail válido.';
    return;
  }
  busy.value = true;
  error.value = '';
  try {
    user.value = await UserService.updateUserProfile({
      name: user.value.name,
      email: user.value.email,
      notify: user.value.preferences.notify,
    });
    showSuccess('Perfil atualizado.');
  } catch {
    error.value = 'Não foi possível atualizar seu perfil.';
  } finally {
    busy.value = false;
  }
}
</script>
