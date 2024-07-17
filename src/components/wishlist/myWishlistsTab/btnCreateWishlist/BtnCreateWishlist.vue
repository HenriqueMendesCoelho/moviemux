<template>
  <div class="col-auto">
    <q-btn icon="add" color="white" size="md" flat round @click="dialog()" />
    <BaseTooltip :delay="500">Criar lista</BaseTooltip>
  </div>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar';
import axios from 'axios';

import BaseTooltip from 'src/core/components/BaseTooltip.vue';

import WishlistService from 'src/core/services/WishlistService';
import { hideLoading, showLoading } from 'src/core/utils/LoadingUtils';
import { showError, showSuccess } from 'src/core/utils/NotificationUtils';

const $q = useQuasar();

const emit = defineEmits<{
  (e: 'ok', value: void): void;
}>();

function dialog() {
  $q.dialog({
    dark: true,
    message: 'Insira o nome da lista (Mínimo 3 caracteres e máximo de 30)',
    persistent: false,
    color: 'kb-primary',
    class: 'bg-grey-mid',
    prompt: {
      model: '',
      type: 'text',
      isValid: (val) => !!val && val.length >= 3 && val.length <= 30,
    },
    ok: {
      label: 'Cadastrar',
      flat: true,
    },
    cancel: {
      label: 'Cancelar',
      flat: true,
    },
    seamless: false,
    focus: 'ok',
  }).onOk(async (data: string | undefined) => {
    await createWishlist(data);
  });
}
async function createWishlist(name?: string) {
  if (!name) {
    return;
  }
  try {
    showLoading();
    await WishlistService.createWishlist(name);
    showSuccess('Lista de filmes criada com sucesso');
    emit('ok');
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      if (error.response?.data?.message === 'User has reached wishlits limit') {
        showError('Você atingiu o limite de 10 listas que podem ser criadas');
      }

      if (error.response?.data?.message.includes('Wishlist already created with the name')) {
        showError('Já existe uma lista criada com o nome ' + name);
      }
    } else {
      showError('Erro ao criar lista');
    }
  } finally {
    hideLoading();
  }
}
</script>
