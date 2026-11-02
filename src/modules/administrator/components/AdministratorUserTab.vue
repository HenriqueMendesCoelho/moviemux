<template>
  <section class="mm-form" :aria-busy="busy">
    <h2>Gerenciar usuário</h2>
    <form class="mm-actions" @submit.prevent="searchUser">
      <label class="mm-field"
        >E-mail do usuário<input
          v-model.trim="email"
          type="email"
          :disabled="busy"
          required /></label
      ><button class="mm-btn mm-btn-primary" :disabled="busy">
        {{ busy ? 'Aguarde…' : 'Buscar usuário' }}
      </button>
    </form>
    <p v-if="error" role="alert" class="mm-error">{{ error }}</p>
    <template v-if="user.id"
      ><BaseUserInfoPanel v-model="user" :all-read-only="true" :show-adm-info="true" />
      <div class="mm-actions">
        <button class="mm-btn" :disabled="busy || isMyself" @click="changeRole('promote')">
          Promover</button
        ><button class="mm-btn" :disabled="busy || isMyself" @click="changeRole('demote')">
          Rebaixar</button
        ><button
          class="mm-btn mm-btn-danger"
          :disabled="busy || isMyself"
          @click="changeRole('block')"
        >
          Bloquear</button
        ><button
          class="mm-btn mm-btn-danger"
          :disabled="busy || isMyself"
          @click="changeRole('delete')"
        >
          Excluir
        </button>
      </div>
      <p v-if="isMyself" class="mm-muted">
        Você não pode alterar as permissões do próprio usuário.
      </p></template
    >
  </section>
</template>
<script setup lang="ts">
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
const error = ref('');
const isMyself = computed(() => user.value.id === store.user.id);
watch(email, () => {
  user.value = new User();
  error.value = '';
});
async function searchUser() {
  if (busy.value || !email.value) return;
  busy.value = true;
  error.value = '';
  try {
    const requestedEmail = email.value;
    const result = await UserService.getUserAdm(requestedEmail);
    if (email.value === requestedEmail) user.value = result;
  } catch {
    error.value = 'Não foi possível encontrar este usuário.';
    user.value = new User();
  } finally {
    busy.value = false;
  }
}
async function changeRole(action: 'promote' | 'demote' | 'block' | 'delete') {
  if (busy.value || !user.value.id || isMyself.value) return;
  const labels = { promote: 'Promover', demote: 'Rebaixar', block: 'Bloquear', delete: 'Excluir' };
  if (!window.confirm(`${labels[action]} o usuário ${user.value.name} (${user.value.email})?`))
    return;
  const targetId = user.value.id;
  const targetEmail = email.value;
  const actorId = store.user.id;
  const isCurrentTarget = () =>
    user.value.id === targetId && email.value === targetEmail && store.user.id === actorId;
  busy.value = true;
  error.value = '';
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
    showSuccess('Usuário atualizado.');
  } catch {
    error.value = 'Não foi possível executar a ação.';
  } finally {
    busy.value = false;
  }
}
</script>
