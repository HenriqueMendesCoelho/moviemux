<template>
  <div class="row justify-center full-height" style="overflow-y: hidden">
    <div class="text-h3 title">Recuperação de conta</div>
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
        :readonly="true"
      >
        <template v-slot:append>
          <q-icon name="mail" />
        </template>
      </q-input>
    </div>
    <div class="col-10 q-mt-xl">
      <button class="btn-underline" style="color: white" @click="changeTab('login')">Volta para login</button>
    </div>
    <div class="col-10">
      <div class="col-12 row justify-center">
        <q-btn class="btn-login" label="Enviar E-mail" color="kb-primary" text-color="black" style="width: 100%" :disable="true" />
        <CustomTooltip :delay="500">Ainda não implementado (WIP)</CustomTooltip>
      </div>
    </div>
    <div class="col-12 row justify-center">
      <div class="row" v-if="createAccount">
        <p style="color: white">Não tem conta ? <button class="btn-underline" @click="changeTab('create')">Criar Conta</button></p>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useQuasar } from 'quasar';

import { InputValidateRefType } from '@/components/shared/inputText/types/InputValidateRefType';
import SeparatorDivLineSolid from '@/components/shared/separator/SeparatorDivLineSolid.vue';
import CustomTooltip from '@/components/shared/customTooltip/CustomTooltip.vue';

export default defineComponent({
  name: 'tabForgotPassword',
  components: { SeparatorDivLineSolid, CustomTooltip },
  props: {
    createAccount: {
      type: Boolean,
      default: true,
    },
  },
  setup() {
    const $q = useQuasar();

    const inputEmailRef = ref<InputValidateRefType>();
    return {
      inputEmailRef,
      showSuccess(msg: string) {
        $q.notify({
          type: 'positive',
          message: msg,
          position: 'top',
        });
      },
      showError(msg: string) {
        $q.notify({
          type: 'negative',
          message: msg,
          position: 'top',
        });
      },
    };
  },
  data() {
    return {
      email: '',
      password: '',
      visibilityPass: false,
      visibilityNewPass: false,
      newPassword: '',
      invite: '',
      nickname: '',
      regexEmail: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/ as RegExp,
    };
  },
  emits: ['changeTab', 'loading'],
  methods: {
    changeTab(tab: string) {
      this.$emit('changeTab', tab);
    },
    hasErrors() {
      let hasErrors = false;
      if (this.inputEmailRef) {
        this.inputEmailRef.validate();
        hasErrors = this.inputEmailRef.hasError;
      }
      return hasErrors;
    },
  },
});
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
