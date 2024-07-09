<template>
  <div class="row justify-center q-gutter-y-md">
    <h5>Gerenciamento do usuário</h5>
    <SeparatorDivLineSolid />
    <div class="col-md-10 col-xs-12 row q-mt-md">
      <InputText class="col-md-10 col-xs-6 q-pr-sm" :label="'E-mail usuário alvo'" v-model="email" :required="false" :dense="true" />
      <q-btn-dropdown
        icon="settings"
        class="col-md-2 col-xs-6 q-pl-sm"
        color="kb-primary"
        label="Ações"
        content-style="background-color: #343c4c; color: white"
      >
        <q-list>
          <q-item clickable v-close-popup @click="searchUser()">
            <q-item-section>
              <q-item-label>Buscar usuário</q-item-label>
            </q-item-section>
          </q-item>

          <q-item clickable v-close-popup @click="promoteUser">
            <q-item-section>
              <q-item-label>Promover Usuário</q-item-label>
            </q-item-section>
          </q-item>

          <q-item clickable v-close-popup @click="demoteUser">
            <q-item-section>
              <q-item-label>Rebaixar usuário</q-item-label>
            </q-item-section>
          </q-item>

          <q-item clickable v-close-popup @click="blockUser">
            <q-item-section>
              <q-item-label>Bloquear usuário</q-item-label>
            </q-item-section>
          </q-item>

          <q-item clickable v-close-popup @click="deleteUser">
            <q-item-section>
              <q-item-label>Deletar usuário</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-btn-dropdown>
    </div>
    <div class="col-md-10 col-xs-12 q-pt-xl">
      <PanelUserInfo v-model="user" :allReadOnly="true" :showAdmInfo="true" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';

import User from 'src/domain/user/User';

import PanelUserInfo from 'src/components/shared/panelUserInfo/PanelUserInfo.vue';
import InputText from 'src/components/shared/inputText/InputText.vue';
import SeparatorDivLineSolid from 'src/components/shared/separator/SeparatorDivLineSolid.vue';

import UserService from 'src/services/UserService';
import { useUserStore } from 'src/core/stores/UserStore';
import { showError, showSuccess } from 'src/utils/NotificationUtils';
import { hideLoading, showLoading } from 'src/utils/LoadingUtils';

const storeUser = useUserStore();

const email = ref('');
const user = ref(new User());

const userStore = computed(() => storeUser.user);

async function searchUser(showSuccessMessage = true) {
  if (!email.value) {
    showError('É necessário preencher o e-mail do usuario alvo');
    return;
  }

  try {
    showLoading();
    const res = await UserService.getUserAdm(email.value);
    user.value = res;
    if (showSuccessMessage) {
      showSuccess('Usuario encontrado com sucesso');
    }
  } catch {
    showError('Erro ao buscar usuario');
  } finally {
    hideLoading();
  }
}

async function promoteUser() {
  if (!(await isUserLoaded()) || isUserMyself()) {
    return;
  }
  try {
    showLoading();
    const res = await UserService.promoteUser(user.value.id);
    user.value = res;
    showSuccess('Usuario promovido');
  } catch {
    showError('Erro ao promover usuario');
  } finally {
    hideLoading();
  }
}

async function demoteUser() {
  if (!(await isUserLoaded()) || isUserMyself()) {
    return;
  }
  try {
    showLoading();
    const res = await UserService.demoteUser(user.value.id);
    user.value = res;
    showSuccess('Usuario rebaixado');
  } catch {
    showError('Erro ao rebaixar usuario');
  } finally {
    hideLoading();
  }
}

async function blockUser() {
  if (!(await isUserLoaded()) || isUserMyself()) {
    return;
  }
  try {
    showLoading();
    const res = await UserService.blockUser(user.value.id);
    user.value = res;
    showSuccess('Usuario bloqueado');
  } catch {
    showError('Erro ao bloqueado usuario');
  } finally {
    hideLoading();
  }
}

async function deleteUser() {
  if (!(await isUserLoaded()) || isUserMyself()) {
    return;
  }
  try {
    showLoading();
    const res = await UserService.deleteUser(user.value.id);
    user.value = res;
    showSuccess('Usuario deletado');
  } catch {
    showError('Erro ao deletar usuario');
  } finally {
    hideLoading();
  }
}

async function isUserLoaded() {
  if (!email.value) {
    showError('É necessário preencher o e-mail do usuario alvo');
    return false;
  }
  if (!user.value.id) {
    await searchUser(false);
  }

  return !!user.value.id;
}

function isUserMyself() {
  if (!user.value.id) {
    return false;
  }

  if (user.value.id === userStore.value.id) {
    showError('Você não pode executar uma ação no seu próprio usuario');
    return true;
  }

  return false;
}
</script>
