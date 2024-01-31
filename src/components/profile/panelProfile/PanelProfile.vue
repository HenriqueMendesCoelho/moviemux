<template>
  <div class="row justify-center" :class="isMobile ? 'q-pt-xs' : 'q-pt-md'">
    <div class="text-responsive-2">Dados pessoais</div>
    <SeparatorDivLineSolid />
    <PanelUserInfo class="col-12 q-mt-md" v-model="user" />
    <div class="row justify-center full-width q-col-gutter-md">
      <div class="col-12" />
      <div class="col-md-2 col-sm-4">
        <q-btn style="width: 100%" color="positive" text-color="white" label="Salvar" @click="updateProfile" />
      </div>
      <div class="col-md-2 col-sm-4">
        <q-btn style="width: 100%" color="red" text-color="white" label="Cancelar" @click="loadUser" />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useQuasar } from 'quasar';

import User from 'src/domain/user/User';

import UserService from 'src/services/UserService';

import SeparatorDivLineSolid from 'src/components/shared/separator/SeparatorDivLineSolid.vue';
import PanelUserInfo from 'src/components/shared/panelUserInfo/PanelUserInfo.vue';

const $q = useQuasar();
const user = ref(new User());

const isMobile = $q.platform.is.mobile;

function showLoading() {
  $q.loading.show({
    spinnerColor: 'kb-primary',
  });
}
function hideLoading() {
  $q.loading.hide();
}
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

onMounted(async () => {
  await loadUser();
});

async function loadUser() {
  const res = await UserService.getUser();
  user.value = res;
}

async function updateProfile() {
  if (!user.value.name || !user.value.email) {
    showError('Todos os campos devem estar preenchidos');
    return;
  }

  try {
    showLoading();
    const res = await UserService.updateUserProfile({
      name: user.value.name,
      email: user.value.email,
      notify: user.value.preferences.notify,
    });
    user.value = res;
    showSuccess('Perfil atualizado com sucesso');
  } catch {
    showError('Erro ao atualizar perfil');
  } finally {
    hideLoading();
  }
}
</script>
