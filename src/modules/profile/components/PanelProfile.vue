<template>
  <form class="mm-form" :aria-busy="busy" @submit.prevent="updateProfile">
    <h2>{{ t('account.personalData') }}</h2>
    <p class="mm-muted">{{ t('account.profileIntro') }}</p>
    <p v-if="error" class="mm-error" role="alert">{{ error }}</p>
    <BaseUserInfoPanel v-if="loaded" v-model="user" />
    <ProfileLoadingState v-else-if="!error" />
    <div class="mm-actions">
      <button class="mm-btn mm-btn-primary" :disabled="busy || !loaded">
        {{ busy ? t('account.wait') : t('account.saveChanges') }}</button
      ><button
        v-if="loaded || error"
        type="button"
        class="mm-btn"
        :disabled="busy"
        @click="loadUser"
      >
        {{ loaded ? t('account.discardChanges') : t('account.retry') }}
      </button>
    </div>
  </form>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
import { computed, onMounted, ref } from 'vue';
import ProfileLoadingState from './ProfileLoadingState.vue';
import User from 'src/core/domain/user/User';
import BaseUserInfoPanel from 'src/core/components/BaseUserInfoPanel.vue';
import UserService from 'src/core/services/UserService';
import { showSuccess } from 'src/core/utils/NotificationUtils';
const user = ref(new User());
const busy = ref(false);
const errorMessage = ref<() => string>(() => '');
const error = computed(() => errorMessage.value());
const loaded = ref(false);
onMounted(loadUser);
async function loadUser() {
  if (busy.value) return;
  busy.value = true;
  errorMessage.value = () => '';
  try {
    user.value = await UserService.getUser();
    loaded.value = true;
  } catch {
    errorMessage.value = () => t('account.profileLoadFailed');
  } finally {
    busy.value = false;
  }
}
async function updateProfile() {
  if (busy.value || !loaded.value) return;
  if (!user.value.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.value.email)) {
    errorMessage.value = () => t('account.profileValidation');
    return;
  }
  busy.value = true;
  errorMessage.value = () => '';
  try {
    user.value = await UserService.updateUserProfile({
      name: user.value.name,
      email: user.value.email,
      notify: user.value.preferences.notify,
    });
    showSuccess(() => t('account.profileUpdated'));
  } catch {
    errorMessage.value = () => t('account.profileUpdateFailed');
  } finally {
    busy.value = false;
  }
}
</script>
