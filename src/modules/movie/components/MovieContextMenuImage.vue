<template>
  <details class="mm-discord-actions">
    <summary>Mensagem no Discord</summary>
    <button type="button" class="mm-button" :disabled="busy" @click="showConfirmDialog('send')">
      Enviar mensagem</button
    ><button type="button" class="mm-button" :disabled="busy" @click="showConfirmDialog('update')">
      Atualizar mensagem
    </button>
  </details>
  <BaseConfirmDialog ref="confirmDialogRef" @ok="sendOrUpdateDiscordMessage($event)" />
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { useUserStore } from 'src/core/stores/UserStore';
import { useMovieContext } from '../composables/useMovieContext';
import { useMovieRequests } from '../composables/useMovieRequests';
import BaseConfirmDialog from 'src/core/components/BaseConfirmDialog.vue';
import DiscordService from 'src/core/services/DiscordService';
import { showError, showSuccess } from 'src/core/utils/NotificationUtils';
const movie = useMovieContext(),
  user = useUserStore(),
  requests = useMovieRequests();
const confirmDialogRef = ref<InstanceType<typeof BaseConfirmDialog>>(),
  busy = ref(false);
let target = '',
  confirmed = () => false;
function showConfirmDialog(action: string) {
  if (busy.value || !user.isAdmin || !user.user.isLoged || !movie.value.id) return;
  target = movie.value.id;
  confirmed = requests.begin('confirm');
  const verb = action === 'send' ? 'enviar' : 'atualizar';
  confirmDialogRef.value?.show({
    title: 'Mensagem no Discord',
    message: `Deseja ${verb} a mensagem de “${movie.value.portuguese_title || movie.value.english_title}”?`,
    focus: 'cancel',
    ok: 'Sim',
    cancel: 'Não',
    event: action,
  });
}
async function sendOrUpdateDiscordMessage(action: string | void) {
  if (
    busy.value ||
    !confirmed() ||
    !user.isAdmin ||
    !user.user.isLoged ||
    !target ||
    target !== movie.value.id ||
    (action !== 'send' && action !== 'update')
  )
    return;
  const current = requests.begin('mutation'),
    id = target;
  busy.value = true;
  try {
    if (action === 'send') await DiscordService.sendDiscordMessage(id);
    else await DiscordService.updateDiscordMessage(id);
    if (current()) showSuccess(action === 'send' ? 'Mensagem enviada.' : 'Mensagem atualizada.');
  } catch {
    if (current()) showError('Não foi possível atualizar a mensagem no Discord.');
  } finally {
    if (current()) busy.value = false;
  }
}
</script>
