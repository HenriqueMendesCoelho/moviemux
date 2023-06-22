<template>
  <div class="full-height">
    <div class="row">
      <div class="col-12">
        <q-toolbar class="bg-grey-dark2 text-white row">
          <q-icon name="menu" class="q-mr-sm" size="sm" />
          <q-btn to="/" round flat>
            <q-avatar>
              <img src="src/assets/logo-kronus.png" />
            </q-avatar>
          </q-btn>

          <q-toolbar-title>Cineminha KronusBoss</q-toolbar-title>
        </q-toolbar>
      </div>
    </div>
    <div class="row justify-center" style="margin-top: 10rem">
      <div class="col-5 row justify-center q-pa-xl q-col-gutter-lg container text-white">
        <PageTitle class="col-auto" icon="password" title="Trocar Senha" />
        <div class="col-12">
          <SeparatorDivLineSolid />
        </div>
        <div class="col-12">
          <q-input
            ref="inputEmailRef"
            name="username"
            label="E-mail"
            v-model="email"
            color="kb-primary"
            bg-color="grey-mid"
            dark
            :type="'email'"
            :rules="[(val) => !!val]"
          >
            <template v-slot:append>
              <q-icon name="mail" />
            </template>
          </q-input>
        </div>
        <div class="col-12">
          <InputPassword
            ref="inputPasswordRef"
            label="Nova Senha"
            v-model="newPassword"
            valid-password
            required
            hint="Mínimo 8 caracteres e máximo 70"
          />
        </div>
        <div class="col-12">
          <InputPassword
            ref="inputConfirmPasswordRef"
            label="Confirme a Nova Senha"
            v-model="confirmNewPassword"
            required
            :custom-rules="() => newPassword === confirmNewPassword || 'Deve ser igual a senha preenchida anteriormente'"
          />
        </div>
        <div class="col-auto">
          <q-btn label="Confirmar" icon="check" color="positive" @click="redefinePassword()" />
        </div>
        <div class="col-auto">
          <q-btn label="Cancelar" icon="close" color="red" @click="cancel()" />
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, onActivated, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';

import SeparatorDivLineSolid from '../shared/separator/SeparatorDivLineSolid.vue';
import PageTitle from '../shared/pageTitle/PageTitle.vue';
import InputPassword from '../shared/inputPassword/InputPassword.vue';

import UserService from 'src/services/UserService';

const $q = useQuasar();
const route = useRoute();
const router = useRouter();

const email = ref('');
const newPassword = ref('');
const confirmNewPassword = ref('');
const inputPasswordRef = ref<{
  hasErrors: () => boolean;
  resetValidation: () => void;
}>();
const inputConfirmPasswordRef = ref<{
  hasErrors: () => boolean;
  resetValidation: () => void;
}>();

const keyPathParam = computed(() => route.params?.key?.toString());

onActivated(() => {
  document.title = 'Cineminha - Alterar senha';
});

onMounted(() => {
  if (!keyPathParam.value || keyPathParam.value?.length !== 200) {
    router.push('/login');
  }
});

function showLoading() {
  $q.loading.show({
    spinnerColor: 'kb-primary',
  });
}
function hideLoading() {
  $q.loading.hide();
}
function showError(msg: string) {
  $q.notify({
    type: 'negative',
    message: msg,
    position: 'top',
  });
}

async function redefinePassword() {
  if (hasErrors()) {
    return;
  }

  try {
    showLoading();
    await UserService.redefinePasswordByKey(keyPathParam.value, {
      email: email.value,
      password: newPassword.value,
    });
    router.push('/');
  } catch {
    showError('Erro ao executar ação, tente novamente mais tarde.');
  } finally {
    hideLoading();
  }
  return;
}
function cancel() {
  newPassword.value = '';
  confirmNewPassword.value = '';
}
function hasErrors() {
  let hasErrors = false;
  if (inputPasswordRef.value) {
    hasErrors = inputPasswordRef.value.hasErrors();
  }
  if (inputConfirmPasswordRef.value) {
    hasErrors = inputConfirmPasswordRef.value.hasErrors();
  }
  return hasErrors;
}
</script>
<style lang="scss">
.container {
  border-radius: 15px;
  background-color: var(--grey-dark2);
  color: white;
  box-shadow: 0 5px 10px var(--shadow);
}
</style>
