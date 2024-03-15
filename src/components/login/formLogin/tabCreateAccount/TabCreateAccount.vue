<template>
  <div class="row justify-center full-height" style="overflow-y: hidden">
    <div class="text-h3 title">Criar nova conta</div>
    <SeparatorDivLineSolid />
    <q-input
      ref="inputEmailRef"
      class="col-10 justify-center"
      label="E-mail"
      v-model="email"
      color="kb-primary"
      bg-color="grey-mid"
      dark
      :type="'email'"
      :rules="[(val) => !!val, (val) => regexEmail.test(val) || 'E-mail inválido']"
      ><template v-slot:append> <q-icon name="mail" /> </template
    ></q-input>
    <InputPassword
      ref="inputPasswordRef"
      class="col-10 justify-center"
      v-model="password"
      required
      valid-password
      hint="Mínimo 8 caracteres e máximo 70"
      :error-text-valid-passord="false"
      @focus="tooltipPassword = true"
      @blur="tooltipPassword = false"
      ><TooltipPassowordInfo v-model="tooltipPassword"
    /></InputPassword>
    <InputPassword
      ref="inputRepeatPasswordRef"
      class="col-10 justify-center"
      v-model="repeatePassword"
      label="Repita a senha"
      required
      :custom-rules="() => password === repeatePassword || 'Deve ser igual a senha preenchida anteriormente'"
    />
    <q-input
      ref="inputNicknameRef"
      class="col-5 justify-center q-pr-sm"
      label="Nickname"
      v-model="nickname"
      color="kb-primary"
      bg-color="grey-mid"
      dark
      :type="'email'"
      :rules="[(val) => !!val, (val) => val.length >= 3 || 'Deve ter no mínimo 3 caracteres']"
      ><template v-slot:append> <q-icon name="badge" /> </template
    ></q-input>
    <q-input
      ref="inputInviteRef"
      class="col-5 justify-center q-pl-sm"
      label="Convite"
      v-model="invite"
      type="password"
      color="kb-primary"
      bg-color="grey-mid"
      dark
      :rules="[(val) => !!val]"
      hint="É necessário ter um convite para prosseguir."
    >
      <template v-slot:append>
        <q-icon name="label_important" />
      </template>
    </q-input>
    <div class="col-10 q-mt-xl">
      <q-btn class="btn-login" label="Criar conta" color="kb-primary" text-color="black" style="width: 100%" @click="create" />
    </div>
    <div class="col-10 justify-center">
      <button class="btn-underline q-mt-xs" style="color: white" @click="changeTab('login')">Volta para login</button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { useQuasar } from 'quasar';
import axios, { AxiosError } from 'axios';

import type { InputValidateRefType } from 'src/components/shared/inputText/types/InputValidateRefType';

import SeparatorDivLineSolid from 'src/components/shared/separator/SeparatorDivLineSolid.vue';
import TooltipPassowordInfo from './tooltipPasswordInfo/TooltipPassowordInfo.vue';
import InputPassword from 'src/components/shared/inputPassword/InputPassword.vue';

import UserService from 'src/services/UserService';
import { showError, showSuccess } from 'src/utils/NotificationUtils';

const emit = defineEmits<{
  (e: 'changeTab', value: string): void;
  (e: 'loading', value: boolean): void;
}>();

const $q = useQuasar();

const inputEmailRef = ref<InputValidateRefType>();
const inputPasswordRef = ref<{
  hasErrors: () => boolean;
  resetValidation: () => void;
}>();
const inputRepeatPasswordRef = ref<{
  hasErrors: () => boolean;
  resetValidation: () => void;
}>();
const inputNicknameRef = ref<InputValidateRefType>();
const inputInviteRef = ref<InputValidateRefType>();

const email = ref('');
const password = ref('');
const repeatePassword = ref('');
const invite = ref('');
const nickname = ref('');
const regexEmail = ref<RegExp>(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/);
const tooltipPassword = ref(false);

function showErrorPassword() {
  $q.notify({
    type: 'warning',
    message:
      '<p>A senha <strong>deve</strong> conter:</p><p>Letras maiúsculas e minúsculas</p><p>Números</p><p>Caracteres especiais</p><p>OK?</p>',
    position: 'top',
    timeout: 10000,
    progress: true,
    html: true,
  });
}

function changeTab(tab: string) {
  emit('changeTab', tab);
}
async function create() {
  if (hasErrors()) {
    return;
  }
  try {
    await UserService.create({
      name: nickname.value,
      email: email.value,
      password: password.value,
      invite_code: invite.value,
    });
    emit('loading', true);
    showSuccess('Conta criada');
    changeTab('login');
  } catch (err) {
    const error = err as Error | AxiosError;
    if (axios.isAxiosError(error)) {
      if (error.response?.data?.errors?.password === 'password is to weak') {
        showErrorPassword();
      }
      if (error.response?.data?.message === 'invite is not valid') {
        showError('O convite é inválido');
      }
    } else {
      showError('Erro ao criar conta');
    }
  } finally {
    emit('loading', false);
  }
}
function hasErrors() {
  let hasErrors = false;
  if (inputEmailRef.value) {
    inputEmailRef.value.validate();
    hasErrors = inputEmailRef.value.hasError;
  }
  if (inputPasswordRef.value) {
    hasErrors = inputPasswordRef.value.hasErrors();
  }
  if (inputRepeatPasswordRef.value) {
    hasErrors = inputRepeatPasswordRef.value.hasErrors();
  }
  if (inputNicknameRef.value) {
    inputNicknameRef.value.validate();
    hasErrors = inputNicknameRef.value.hasError;
  }
  if (inputInviteRef.value) {
    inputInviteRef.value.validate();
    hasErrors = inputInviteRef.value.hasError;
  }
  return hasErrors;
}
</script>

<style lang="scss" scoped>
.title {
  color: var(--primary);
}
.btn-underline {
  color: var(--primary);
  text-decoration: underline;
}

.btn-login {
  font-weight: 600;
  &:hover {
    background-color: var(--light-blue);
    box-shadow: 0 10px 30px -20px var(--light-blue);
    transition: 0.2s ease-out;
  }
}
</style>
