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
                color="cyan-14"
                bg-color="grey-2"
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
                color="cyan-14"
                bg-color="grey-2"
                dark
                :rules="[(val) => !!val]"
                ><template v-slot:append>
                  <q-icon name="visibility" v-if="!visibilityPass" @click="visibilityPass = !visibilityPass" />
                  <q-icon name="visibility_off" v-if="visibilityPass" @click="visibilityPass = !visibilityPass" /></template
              ></q-input>
              <button class="btn-underline q-mt-md" @click="tab = 'forgot'">Esqueceu sua senha ?</button>
            </div>
            <div class="col-10 q-mt-xl">
              <q-btn class="btn-login" label="login" @click="login()" color="cyan-14" text-color="black" style="width: 100%" />
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
                color="cyan-14"
                bg-color="grey-2"
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
              <q-btn class="btn-login" label="Enviar E-mail" color="cyan-14" text-color="black" style="width: 100%" />
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
            <div class="col-10 justify-center">
              <q-input label="E-mail" v-model="email" color="cyan-14" bg-color="grey-2" dark :type="'email'"
                ><template v-slot:append> <q-icon name="mail" /> </template
              ></q-input>
            </div>
            <q-input
              class="col-5 justify-center q-pr-md"
              label="Senha"
              v-model="password"
              :type="visibilityPass ? 'text' : 'password'"
              color="cyan-14"
              bg-color="grey-2"
              dark
              ><template v-slot:append>
                <q-icon name="visibility" v-if="!visibilityPass" @click="visibilityPass = !visibilityPass" />
                <q-icon name="visibility_off" v-if="visibilityPass" @click="visibilityPass = !visibilityPass" /></template
            ></q-input>
            <q-input
              class="col-5 justify-center q-pl-md"
              label="Repita a senha"
              v-model="newPassword"
              :type="visibilityNewPass ? 'text' : 'password'"
              color="cyan-14"
              bg-color="grey-2"
              dark
              ><template v-slot:append>
                <q-icon name="visibility" v-if="!visibilityNewPass" @click="visibilityNewPass = !visibilityNewPass" />
                <q-icon name="visibility_off" v-if="visibilityNewPass" @click="visibilityNewPass = !visibilityNewPass" /></template
            ></q-input>
            <div class="col-10 justify-center">
              <q-input
                label="Convite"
                v-model="invite"
                type="password"
                color="cyan-14"
                bg-color="grey-2"
                dark
                hint="É necessário ter um convite para prosseguir."
              >
                <template v-slot:append>
                  <q-icon name="label_important" />
                </template>
              </q-input>
            </div>
            <div class="col-10 q-mt-xl">
              <q-btn class="btn-login" label="Criar conta" color="cyan-14" text-color="black" style="width: 100%" />
            </div>
            <div class="col-10 justify-center">
              <button class="btn-underline q-mt-md" style="color: white" @click="tab = 'login'">Volta para login</button>
            </div>
          </q-tab-panel>
        </q-tab-panels>
      </q-card-section>
      <q-inner-loading :showing="loading" label="Aguarde..." color="cyan-14" label-class="text-white" :dark="true" />
    </q-card>
  </div>
</template>

<script lang="ts" scoped>
import { defineComponent, ref } from 'vue';
import { useQuasar } from 'quasar';
import { mapActions } from 'pinia';

import { useUserStore } from '@/stores/UserStore';

import SeparatorDivLineSolid from '../shared/separator/SeparatorDivLineSolid.vue';

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

    // eslint-disable-next-line
    const inputEmailRef = ref<any>(null);
    // eslint-disable-next-line
    const inputPasswordRef = ref<any>(null);

    return {
      inputEmailRef,
      inputPasswordRef,
      showError(msg: string) {
        $q.notify({
          type: 'negative',
          message: msg,
          position: 'bottom',
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
        this.$router.push('/home');
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
        hasErrors = this.inputEmailRef.hasError;
      }
      return hasErrors;
    },
  },
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
