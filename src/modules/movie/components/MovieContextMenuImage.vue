<template>
  <details class="mm-discord-actions">
    <summary>{{ t('catalog.movie.discordTitle') }}</summary>
    <div class="mm-discord-action-buttons">
      <button type="button" class="mm-button" :disabled="busy" @click="showConfirmDialog('send')">
        {{ t('catalog.movie.sendMessage') }}
      </button>
      <button type="button" class="mm-button" :disabled="busy" @click="showConfirmDialog('update')">
        {{ t('catalog.movie.updateMessage') }}
      </button>
    </div>
  </details>
  <BaseConfirmDialog ref="confirmDialogRef" @ok="sendOrUpdateDiscordMessage($event)" />
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
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
  confirmDialogRef.value?.show({
    title: () => t('catalog.movie.discordTitle'),
    message: () =>
      t(
        action === 'send'
          ? 'catalog.movie.discordSendConfirm'
          : 'catalog.movie.discordUpdateConfirm',
        {
          title:
            movie.value.portuguese_title || movie.value.english_title || t('catalog.movie.movie'),
        },
      ),
    focus: 'cancel',
    ok: () => t('catalog.movie.yes'),
    cancel: () => t('catalog.movie.no'),
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
    if (current())
      showSuccess(() =>
        action === 'send' ? t('catalog.movie.messageSent') : t('catalog.movie.messageUpdated'),
      );
  } catch {
    if (current()) showError(() => t('catalog.movie.discordError'));
  } finally {
    if (current()) busy.value = false;
  }
}
</script>

<style scoped>
.mm-discord-action-buttons {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 0.75rem;
  padding-top: 0.75rem;
}
.mm-discord-action-buttons .mm-button {
  box-sizing: border-box;
  min-height: 44px;
  max-width: 100%;
  white-space: normal;
}
</style>
