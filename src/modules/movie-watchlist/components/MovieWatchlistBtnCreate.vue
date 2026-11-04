<template>
  <div>
    <button class="mm-button mm-button-primary" type="button" @click="openDialog">
      {{ t('library.createListAction') }}
    </button>
    <BaseModal v-model="visible" :title="t('library.newList')">
      <form @submit.prevent="createWishlist">
        <label
          >{{ t('library.name')
          }}<input
            v-model="name"
            required
            minlength="3"
            maxlength="30"
            autofocus
            :placeholder="t('library.namePlaceholder')"
        /></label>
        <p>{{ t('library.nameHelp') }}</p>
        <div class="mm-actions">
          <button class="mm-button" type="button" @click="visible = false">
            {{ t('library.cancel') }}</button
          ><button class="mm-button mm-button-primary" :disabled="busy || name.trim().length < 3">
            {{ busy ? t('library.creating') : t('library.createList') }}
          </button>
        </div>
      </form>
    </BaseModal>
  </div>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
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
    showSuccess('library.created');
    visible.value = false;
    emit('ok');
  } catch (error) {
    if (!current()) return;
    const message = axios.isAxiosError(error) ? String(error.response?.data?.message || '') : '';
    showError(
      message.includes('wishlits limit')
        ? 'library.limitReached'
        : message.includes('Wishlist already created with the name')
          ? 'library.duplicateName'
          : 'library.createFailed',
    );
  } finally {
    if (current()) busy.value = false;
  }
}
</script>
