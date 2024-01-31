<template>
  <ContextMenu v-if="userStore.isAdmin">
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
  </ContextMenu>
  <ConfirmDialog ref="confirmDialogRef" @ok="sendOrUpdateDiscordMessage($event)" />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useQuasar } from 'quasar';

import { useMovieStore } from 'src/stores/MovieStore';
import { useUserStore } from 'src/stores/UserStore';

import ContextMenu from 'src/components/shared/contextMenu/ContextMenu.vue';
import ConfirmDialog from 'src/components/shared/confirmDialog/ConfirmDialog.vue';

import DiscordService from 'src/services/DiscordService';

const $q = useQuasar();
const movieStore = useMovieStore();
const movie = computed(() => movieStore.moviePage.selectedMovie);

const userStore = useUserStore();

const confirmDialogRef = ref<InstanceType<typeof ConfirmDialog>>();

function showSuccess(msg: string) {
  $q.notify({
    type: 'positive',
    message: msg,
    position: 'top',
  });
}
function showError(msg: string) {
  $q.notify({
    type: 'negative',
    message: msg,
    position: 'top',
  });
}

function showConfirmDialog(action: string) {
  const actionTextMessage = action === 'send' ? 'enviar' : 'atualizar';
  const actionTextTitle = action === 'send' ? 'o envio' : 'a atualização';

  confirmDialogRef.value?.show({
    title: `Confirme ${actionTextTitle}`,
    message: `Deseja ${actionTextMessage} a mensagem para o discord? Do filme ${
      movie.value.portuguese_title || movie.value.english_title
    }.`,
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
