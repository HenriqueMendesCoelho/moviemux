<template>
  <div>
    <button class="mm-button mm-button-primary" type="button" @click="openDialog">
      + Criar lista
    </button>
    <BaseModal v-model="visible" title="Nova lista de filmes">
      <form @submit.prevent="createWishlist">
        <label
          >Nome<input
            v-model="name"
            required
            minlength="3"
            maxlength="30"
            autofocus
            placeholder="Ex.: Filmes para o fim de semana"
        /></label>
        <p>Use entre 3 e 30 caracteres.</p>
        <div class="mm-actions">
          <button class="mm-button" type="button" @click="visible = false">Cancelar</button
          ><button class="mm-button mm-button-primary" :disabled="busy || name.trim().length < 3">
            {{ busy ? 'Criando…' : 'Criar lista' }}
          </button>
        </div>
      </form>
    </BaseModal>
  </div>
</template>
<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import { useUserStore } from 'src/core/stores/UserStore';
import BaseModal from 'src/core/components/BaseModal.vue';
import axios from 'axios';
import MovieWatchlistService from '../services/MovieWatchlistService';
import { showError, showSuccess } from 'src/core/utils/NotificationUtils';
const emit = defineEmits<{ (e: 'ok'): void }>();
const user = useUserStore();
let disposed = false;
let generation = 0;
onBeforeUnmount(() => {
  disposed = true;
  generation++;
});
const visible = ref(false);
const name = ref('');
const busy = ref(false);
watch(
  () => user.user.id,
  () => {
    generation++;
    visible.value = false;
    busy.value = false;
  },
);
function openDialog() {
  if (busy.value || !user.user.isLoged) return;
  name.value = '';
  visible.value = true;
}
async function createWishlist() {
  if (
    !user.user.isLoged ||
    busy.value ||
    name.value.trim().length < 3 ||
    name.value.trim().length > 30
  )
    return;
  const version = generation;
  const session = user.user;
  const current = () =>
    !disposed && version === generation && session === user.user && user.user.isLoged;
  busy.value = true;
  try {
    await MovieWatchlistService.createWatchlist(name.value.trim());
    if (!current()) return;
    showSuccess('Lista criada com sucesso');
    visible.value = false;
    emit('ok');
  } catch (error) {
    if (!current()) return;
    const message = axios.isAxiosError(error) ? String(error.response?.data?.message || '') : '';
    showError(
      message.includes('wishlits limit')
        ? 'Você atingiu o limite de 10 listas'
        : message.includes('Wishlist already created with the name')
          ? 'Já existe uma lista com esse nome'
          : 'Erro ao criar lista',
    );
  } finally {
    if (current()) busy.value = false;
  }
}
</script>
