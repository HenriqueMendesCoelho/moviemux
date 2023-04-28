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
      <button class="btn-underline q-mt-md" style="color: white" @click="changeTab('login')">Volta para login</button>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useQuasar } from 'quasar';
import axios, { AxiosError } from 'axios';

import { InputValidateRefType } from '@/components/shared/inputText/types/InputValidateRefType';
import UserService from '@/services/UserService';

import SeparatorDivLineSolid from '@/components/shared/separator/SeparatorDivLineSolid.vue';
import TooltipPassowordInfo from './tooltipPasswordInfo/TooltipPassowordInfo.vue';
import InputPassword from '@/components/shared/inputPassword/InputPassword.vue';

export default defineComponent({
  name: 'tabCreateAccount',
  components: { SeparatorDivLineSolid, TooltipPassowordInfo, InputPassword },
  props: {
    createAccount: {
      type: Boolean,
      default: true,
    },
  },
  setup() {
    const $q = useQuasar();

    const inputEmailRef = ref<InputValidateRefType>();
    const inputPasswordRef = ref<{ hasErrors: () => boolean; resetValidation: () => void }>();
    const inputRepeatPasswordRef = ref<{ hasErrors: () => boolean; resetValidation: () => void }>();
    const inputNicknameRef = ref<InputValidateRefType>();
    const inputInviteRef = ref<InputValidateRefType>();
    return {
      inputEmailRef,
      inputPasswordRef,
      inputRepeatPasswordRef,
      inputNicknameRef,
      inputInviteRef,

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
          timeout: 10000,
        });
      },
      showErrorPassword() {
        $q.notify({
          type: 'warning',
          message:
            '<p>A senha <strong>deve</strong> conter:</p><p>Letras maiúsculas e minúsculas</p><p>Números</p><p>Caracteres especiais</p><p>OK?</p>',
          position: 'top',
          timeout: 10000,
          progress: true,
          html: true,
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
      repeatePassword: '',
      invite: '',
      nickname: '',
      regexEmail: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/ as RegExp,
      regexPassword: /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,70}$/ as RegExp,
      tooltipPassword: false,
    };
  },
  emits: ['changeTab', 'loading'],
  computed: {},
  methods: {
    changeTab(tab: string) {
      this.$emit('changeTab', tab);
    },
    async create() {
      if (this.hasErrors()) {
        return;
      }
      try {
        await UserService.create({ name: this.nickname, email: this.email, password: this.password, invite_code: this.invite });
        this.$emit('loading', true);
        this.showSuccess('Conta criada');
        this.changeTab('login');
      } catch (err) {
        const error = err as Error | AxiosError;
        if (axios.isAxiosError(error)) {
          if (error.response?.data?.errors?.password === 'password is to weak') {
            this.showErrorPassword();
          }
          if (error.response?.data?.message === 'invite is not valid') {
            this.showError('O convite é inválido');
          }
        } else {
          this.showError('Erro ao criar conta');
        }
      } finally {
        this.$emit('loading', false);
      }
    },
    hasErrors() {
      let hasErrors = false;
      if (this.inputEmailRef) {
        this.inputEmailRef.validate();
        hasErrors = this.inputEmailRef.hasError;
      }
      if (this.inputPasswordRef) {
        hasErrors = this.inputPasswordRef.hasErrors();
      }
      if (this.inputRepeatPasswordRef) {
        hasErrors = this.inputRepeatPasswordRef.hasErrors();
      }
      if (this.inputNicknameRef) {
        this.inputNicknameRef.validate();
        hasErrors = this.inputNicknameRef.hasError;
      }
      if (this.inputInviteRef) {
        this.inputInviteRef.validate();
        hasErrors = this.inputInviteRef.hasError;
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
