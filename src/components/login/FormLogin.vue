<template>
  <div class="row justify-center">
    <q-card class="form-login col-5" style="border-radius: 15px; min-width: 550px">
      <q-card-section class="row justify-center">
        <q-tab-panels v-model="tab" class="tabs col-12" animated style="min-height: 460px">
          <q-tab-panel name="login" class="row justify-center">
            <h3>Login</h3>
            <SeparatorDivLineSolid />
            <div class="col-10 justify-center">
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
            <div class="col-10 justify-center q-mt-md">
              <q-input
                ref="inputPasswordRef"
                name="password"
                label="Senha"
                v-model="password"
                :type="visibilityPass ? 'text' : 'password'"
                color="kb-primary"
                bg-color="grey-mid"
                dark
                :rules="[(val) => !!val]"
                ><template v-slot:append>
                  <q-icon name="visibility" v-if="!visibilityPass" @click="visibilityPass = !visibilityPass" />
                  <q-icon name="visibility_off" v-if="visibilityPass" @click="visibilityPass = !visibilityPass" /></template
              ></q-input>
              <button class="btn-underline q-mt-md" @click="tab = 'forgot'">Esqueceu sua senha ?</button>
            </div>
            <div class="col-10 q-mt-xl">
              <q-btn class="btn-login" label="entrar" @click="login()" color="kb-primary" text-color="black" style="width: 100%" />
            </div>
            <div class="col-12 row justify-center q-mt-md">
              <div class="row" v-if="createAccount">
                <p style="color: white">Não tem conta ? <button class="btn-underline" @click="tab = 'create'">Criar agora</button></p>
              </div>
            </div>
          </q-tab-panel>

          <q-tab-panel name="forgot" class="row justify-center">
            <h3>Recuperação de conta</h3>
            <SeparatorDivLineSolid />
            <div class="col-10">
              <q-input
                label="E-mail"
                v-model="email"
                color="kb-primary"
                bg-color="grey-mid"
                dark
                :type="'email'"
                hint="Insira seu e-mail para seguir com a recuperação"
              >
                <template v-slot:append>
                  <q-icon name="mail" />
                </template>
              </q-input>
            </div>
            <div class="col-10 q-mt-xl">
              <button class="btn-underline" style="color: white" @click="tab = 'login'">Volta para login</button>
            </div>
            <div class="col-10">
              <q-btn class="btn-login" label="Enviar E-mail" color="kb-primary" text-color="black" style="width: 100%" />
            </div>
            <div class="col-12 row justify-center">
              <div class="row" v-if="createAccount">
                <p style="color: white">Não tem conta ? <button class="btn-underline" @click="tab = 'create'">Criar Conta</button></p>
              </div>
            </div>
          </q-tab-panel>

          <q-tab-panel name="create" class="row justify-center">
            <h3>Criar nova conta</h3>
            <SeparatorDivLineSolid />
            <q-input
              ref="inputEmailCreateAccountRef"
              class="col-10 justify-center"
              label="E-mail"
              v-model="email"
              color="kb-primary"
              bg-color="grey-mid"
              dark
              :type="'email'"
              ><template v-slot:append> <q-icon name="mail" /> </template
            ></q-input>
            <q-input
              ref="inputPasswordCreateAccountRef"
              class="col-5 justify-center q-pr-sm"
              label="Senha"
              v-model="password"
              :type="visibilityPass ? 'text' : 'password'"
              color="kb-primary"
              bg-color="grey-mid"
              dark
              ><template v-slot:append>
                <q-icon name="visibility" v-if="!visibilityPass" @click="visibilityPass = !visibilityPass" />
                <q-icon name="visibility_off" v-if="visibilityPass" @click="visibilityPass = !visibilityPass" /></template
            ></q-input>
            <q-input
              ref="inputRepeatPasswordCreateAccountRef"
              class="col-5 justify-center q-pl-sm"
              label="Repita a senha"
              v-model="newPassword"
              :type="visibilityNewPass ? 'text' : 'password'"
              color="kb-primary"
              bg-color="grey-mid"
              dark
              ><template v-slot:append>
                <q-icon name="visibility" v-if="!visibilityNewPass" @click="visibilityNewPass = !visibilityNewPass" />
                <q-icon name="visibility_off" v-if="visibilityNewPass" @click="visibilityNewPass = !visibilityNewPass" /></template
            ></q-input>
            <q-input
              ref="inputNicknameCreateAccountRef"
              class="col-5 justify-center q-pr-sm"
              label="Nickname"
              v-model="nickname"
              color="kb-primary"
              bg-color="grey-mid"
              dark
              :type="'email'"
              ><template v-slot:append> <q-icon name="badge" /> </template
            ></q-input>
            <q-input
              ref="inputInviteCreateAccountRef"
              class="col-5 justify-center q-pl-sm"
              label="Convite"
              v-model="invite"
              type="password"
              color="kb-primary"
              bg-color="grey-mid"
              dark
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
              <button class="btn-underline q-mt-md" style="color: white" @click="tab = 'login'">Volta para login</button>
            </div>
          </q-tab-panel>
        </q-tab-panels>
      </q-card-section>
      <q-inner-loading :showing="loading" label="Aguarde..." color="kb-primary" label-class="text-white" :dark="true" />
    </q-card>
  </div>
</template>

<script lang="ts" scoped>
import { defineComponent, ref } from 'vue';
import { useQuasar } from 'quasar';
import { mapActions } from 'pinia';

import { useUserStore } from '@/stores/UserStore';

import { InputValidateRefType } from '../shared/inputText/types/InputValidateRefType';

import SeparatorDivLineSolid from '../shared/separator/SeparatorDivLineSolid.vue';
import UserService from '@/services/UserService';
import axios, { AxiosError } from 'axios';

export default defineComponent({
  nome: 'FormForm',
  props: {
    modelValue: {
      type: String,
      default: 'login',
    },
    createAccount: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['update:modelValue'],
  components: {
    SeparatorDivLineSolid,
  },
  setup() {
    const $q = useQuasar();

    const inputEmailRef = ref<InputValidateRefType>();
    const inputPasswordRef = ref<InputValidateRefType>();

    return {
      inputEmailRef,
      inputPasswordRef,
      showError(msg: string) {
        $q.notify({
          type: 'negative',
          message: msg,
          position: 'top',
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
      tab: 'login',
      email: '',
      password: '',
      newPassword: '',
      invite: '',
      nickname: '',
      visibilityPass: false,
      visibilityNewPass: false,
      loading: false,
    };
  },
  methods: {
    ...mapActions(useUserStore, { signIn: 'login' }),
    resetData() {
      this.email = '';
      this.password = '';
      this.newPassword = '';
      this.invite = '';
    },
    async login() {
      if (this.hasErrors()) {
        return;
      }

      try {
        this.loading = true;
        await this.signIn({ email: this.email, password: this.password });
        if (this.$route.name === 'login') {
          this.$router.push('/home');
        } else {
          window.location.reload();
        }
      } catch {
        this.showError('Error ao fazer login, tente novamente mais tarde!');
      } finally {
        this.loading = false;
      }
    },
    hasErrors() {
      let hasErrors = false;
      if (this.inputEmailRef) {
        this.inputEmailRef.validate();
        hasErrors = this.inputEmailRef.hasError;
      }
      if (this.inputPasswordRef) {
        this.inputPasswordRef.validate();
        hasErrors = this.inputPasswordRef.hasError;
      }
      return hasErrors;
    },
    async create() {
      try {
        await UserService.create({ name: this.nickname, email: this.email, password: this.password, invite_code: this.invite });
        this.tab = 'login';
      } catch (err) {
        const error = err as Error | AxiosError;
        if (axios.isAxiosError(error)) {
          console.log(error.response?.data.errors.password);
          if (error.response?.data.errors.password === 'password is to weak') {
            this.showErrorPassword();
          }
          if (error.response?.data.message === 'invite is not valid') {
            this.showError('O convite é inválido');
            return;
          }
        } else {
          this.showError('Erro ao criar conta');
        }
      }
    },
  },
  //A senha deve conter no mínimo 8 carecteres, letras maiúsculas e minúsculas, números e caracteres especiais
  watch: {
    modelValue() {
      this.tab = this.modelValue;
    },
    tab() {
      this.$emit('update:modelValue', this.tab);
      this.resetData();
    },
  },
});
</script>

<style lang="scss" scoped>
.form-login {
  background-color: var(--grey-mid);
  box-shadow: 0 10px 30px var(--shadow);

  h3 {
    color: var(--primary);
  }

  .tabs {
    background-color: transparent;

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
  }
}
</style>
