<template>
  <section class="mm-form" :aria-busy="busy">
    <h2>{{ t('account.manageUser') }}</h2>
    <form class="mm-actions" @submit.prevent="searchUser">
      <label class="mm-field"
        >{{ t('account.userEmail')
        }}<input v-model.trim="email" type="email" :disabled="busy" required /></label
      ><button class="mm-btn mm-btn-primary" :disabled="busy">
        {{ busy ? t('account.wait') : t('account.findUser') }}
      </button>
    </form>
    <p v-if="error" role="alert" class="mm-error">{{ error }}</p>
    <template v-if="user.id"
      ><BaseUserInfoPanel v-model="user" :all-read-only="true" :show-adm-info="true" />
      <div class="mm-actions">
        <button class="mm-btn" :disabled="busy || isMyself" @click="changeRole('promote')">
          {{ t('account.promote') }}</button
        ><button class="mm-btn" :disabled="busy || isMyself" @click="changeRole('demote')">
          {{ t('account.demote') }}</button
        ><button
          class="mm-btn mm-btn-danger"
          :disabled="busy || isMyself"
          @click="changeRole('block')"
        >
          {{ t('account.block') }}</button
        ><button
          class="mm-btn mm-btn-danger"
          :disabled="busy || isMyself"
          @click="changeRole('delete')"
        >
          {{ t('account.delete') }}
        </button>
      </div>
      <p v-if="isMyself" class="mm-muted">
        {{ t('account.selfPermission') }}
      </p></template
    >
  </section>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
import { computed, ref, watch } from 'vue';
import User from 'src/core/domain/user/User';
import BaseUserInfoPanel from 'src/core/components/BaseUserInfoPanel.vue';
import UserService from 'src/core/services/UserService';
import { useUserStore } from 'src/core/stores/UserStore';
import { showSuccess } from 'src/core/utils/NotificationUtils';
const store = useUserStore();
const email = ref('');
const user = ref(new User());
const busy = ref(false);
const errorMessage = ref<() => string>(() => '');
const error = computed(() => errorMessage.value());
const isMyself = computed(() => user.value.id === store.user.id);
watch(email, () => {
  user.value = new User();
  errorMessage.value = () => '';
});
async function searchUser() {
  if (busy.value || !email.value) return;
  busy.value = true;
  errorMessage.value = () => '';
  try {
    const requestedEmail = email.value;
    const result = await UserService.getUserAdm(requestedEmail);
    if (email.value === requestedEmail) user.value = result;
  } catch {
    errorMessage.value = () => t('account.userNotFound');
    user.value = new User();
  } finally {
    busy.value = false;
  }
}
async function changeRole(action: 'promote' | 'demote' | 'block' | 'delete') {
  if (busy.value || !user.value.id || isMyself.value) return;
  if (
    !window.confirm(
      t(`account.${action}UserConfirm`, { name: user.value.name, email: user.value.email }),
    )
  )
    return;
  const targetId = user.value.id;
  const targetEmail = email.value;
  const actorId = store.user.id;
  const isCurrentTarget = () =>
    user.value.id === targetId && email.value === targetEmail && store.user.id === actorId;
  busy.value = true;
  errorMessage.value = () => '';
  try {
    if (action === 'delete') {
      await UserService.deleteUser(targetId);
      if (isCurrentTarget()) user.value = new User();
    } else {
      const methods = {
        promote: UserService.promoteUser,
        demote: UserService.demoteUser,
        block: UserService.blockUser,
      };
      const updated = await methods[action](targetId);
      if (isCurrentTarget()) user.value = updated;
    }
    showSuccess(() => t('account.userUpdated'));
  } catch {
    errorMessage.value = () => t('account.actionFailed');
  } finally {
    busy.value = false;
  }
}
</script>
