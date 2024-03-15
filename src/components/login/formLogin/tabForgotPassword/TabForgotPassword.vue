<template>
  <div class="row justify-center full-height">
    <div class="text-h3 title">Recuperar conta</div>
    <SeparatorDivLineSolid />
    <div class="col-10">
      <q-input
        ref="inputEmailRef"
        label="E-mail"
        v-model="email"
        color="kb-primary"
        bg-color="grey-mid"
        dark
        :type="'email'"
        hint="Insira seu e-mail para seguir com a recuperação"
        :rules="[(val) => !!val, (val) => regexEmail.test(val) || 'E-mail inválido']"
      >
        <template v-slot:append>
          <q-icon name="mail" />
        </template>
      </q-input>
    </div>
    <div class="col-10 q-mt-xl q-mb-xs">
      <button class="btn-underline text-white" @click="changeTab('login')">Volta para login</button>
    </div>
    <div class="col-10">
      <div class="col-12 row justify-center">
        <q-btn class="btn-login" label="Enviar E-mail" color="kb-primary" text-color="black" style="width: 100%" @click="sendEmail()" />
      </div>
    </div>
    <div class="col-12 row justify-center">
      <div class="row" v-if="props.createAccount">
        <p class="text-white">
          Não tem conta ?
          <button class="btn-underline" @click="changeTab('create')">Criar Conta</button>
        </p>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ref } from 'vue';

import { InputValidateRefType } from 'src/components/shared/inputText/types/InputValidateRefType';
import SeparatorDivLineSolid from 'src/components/shared/separator/SeparatorDivLineSolid.vue';

import UserService from 'src/services/UserService';
import { showError, showSuccess } from 'src/utils/NotificationUtils';

interface Props {
  createAccount: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  createAccount: true,
});

const emit = defineEmits<{
  (e: 'changeTab', value: string): void;
  (e: 'loading', value: boolean): void;
}>();

const inputEmailRef = ref<InputValidateRefType>();
const email = ref('');
const regexEmail = ref(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/);

function changeTab(tab: string) {
  emit('changeTab', tab);
}
function hasErrors() {
  let hasErrors = false;
  if (inputEmailRef.value) {
    inputEmailRef.value.validate();
    hasErrors = inputEmailRef.value.hasError;
  }
  return hasErrors;
}
async function sendEmail() {
  if (hasErrors()) {
    return;
  }

  try {
    emit('loading', true);
    await UserService.createRedefinePassowordKey(email.value);
    showSuccess('E-mail enviado.');
    emit('changeTab', 'login');
  } catch (error) {
    showError('Erro ao executar ação, tente novamente mais tarde.');
  } finally {
    emit('loading', false);
  }
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
