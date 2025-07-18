<template>
  <BaseContextMenu>
    <q-list style="min-width: 100px">
      <q-item clickable @click="showConfirmDialog('send')" v-close-popup>
        <span class="material-icons" style="font-size: 25pt"> send </span>
        <q-item-section class="q-pl-sm">Enviar mensagem no Discord</q-item-section>
      </q-item>
      <q-item clickable @click="showConfirmDialog('update')" v-close-popup>
        <span class="material-icons" style="font-size: 25pt"> update </span>
        <q-item-section class="q-pl-sm">Atualizar mensagem do Discord</q-item-section>
      </q-item>
    </q-list>
  </BaseContextMenu>
  <BaseConfirmDialog ref="confirmDialogRef" @ok="sendOrUpdateDiscordMessage($event)" />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

import { useMovieStore } from '../stores/MovieStore';

import BaseContextMenu from 'src/core/components/BaseContextMenu.vue';
import BaseConfirmDialog from 'src/core/components/BaseConfirmDialog.vue';

import DiscordService from 'src/core/services/DiscordService';
import { showError, showSuccess } from 'src/core/utils/NotificationUtils';

const movie = computed(() => useMovieStore().moviePage.selectedMovie);

const confirmDialogRef = ref<InstanceType<typeof BaseConfirmDialog>>();

function showConfirmDialog(action: string) {
  const actionTextMessage = action === 'send' ? 'enviar' : 'atualizar';
  const actionTextTitle = action === 'send' ? 'o envio' : 'a atualização';

  confirmDialogRef.value?.show({
    title: `Confirme ${actionTextTitle}`,
    message: `Deseja ${actionTextMessage} a mensagem para o discord? Do filme '${
      movie.value.portuguese_title || movie.value.english_title
    }'.`,
    focus: 'cancel',
    ok: 'Sim',
    cancel: 'Não',
    event: action,
  });
}
async function sendOrUpdateDiscordMessage(action: string) {
  if (action === 'send') {
    await sendDiscordMessage();
    return;
  }

  await updateDiscordMessage();
}
async function sendDiscordMessage() {
  if (!movie.value.id) {
    return;
  }

  try {
    await DiscordService.sendDiscordMessage(movie.value.id);
    showSuccess('Mensagem enviada.');
  } catch {
    showError('Erro ao tentar enviar mensagem. Tente novamente mais tarde.');
  }
}
async function updateDiscordMessage() {
  if (!movie.value.id) {
    return;
  }

  try {
    await DiscordService.updateDiscordMessage(movie.value.id);
    showSuccess('Mensagem atualizada.');
  } catch {
    showError('Erro ao tentar atualizar mensagem. Tente novamente mais tarde.');
  }
}
</script>
