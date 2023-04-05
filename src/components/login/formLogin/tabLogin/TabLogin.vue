<template>
  <div class="row justify-center full-height" style="overflow-y: hidden">
    <div class="text-h3 title">Login</div>
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
      <button class="btn-underline q-mt-md" @click="changeTab('forgot')">Esqueceu sua senha ?</button>
    </div>
    <div class="col-10 q-mt-xl">
      <q-btn
        ref="btnLoginRef"
        class="btn-login"
        label="entrar"
        @click="login()"
        color="kb-primary"
        text-color="black"
        style="width: 100%"
      />
    </div>
    <div class="col-12 row justify-center q-mt-md">
      <div class="row" v-if="createAccount">
        <p style="color: white">Não tem conta ? <button class="btn-underline" @click="changeTab('create')">Criar agora</button></p>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { useQuasar } from 'quasar';
import { defineComponent, ref } from 'vue';
import { mapActions } from 'pinia';

import { InputValidateRefType } from '@/components/shared/inputText/types/InputValidateRefType';
import { useUserStore } from '@/stores/UserStore';
import SeparatorDivLineSolid from '@/components/shared/separator/SeparatorDivLineSolid.vue';

type btnFocusRefType = {
  $el: {
    focus: () => void;
  };
};

export default defineComponent({
  name: 'tabLogin',
  components: { SeparatorDivLineSolid },
  props: {
    createAccount: {
      type: Boolean,
      default: true,
    },
  },
  setup() {
    const $q = useQuasar();

    const inputEmailRef = ref<InputValidateRefType>();
    const inputPasswordRef = ref<InputValidateRefType>();

    const btnLoginRef = ref<btnFocusRefType>();
    return {
      inputEmailRef,
      inputPasswordRef,
      btnLoginRef,
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
    };
  },
  emits: ['changeTab', 'loading'],
  mounted() {
    this.btnLoginRef?.$el.focus();
  },
  methods: {
    ...mapActions(useUserStore, { signIn: 'login' }),
    changeTab(tab: string) {
      this.$emit('changeTab', tab);
    },
    async login() {
      if (this.hasErrors()) {
        return;
      }

      try {
        this.$emit('loading', true);
        await this.signIn({ email: this.email, password: this.password });
        if (this.$route.name === 'login') {
          if (this.$route.query.from) {
            this.$router.push(this.$route.query.from.toString());
            return;
          }

          this.$router.push('/home');
        } else {
          window.location.reload();
        }
      } catch {
        this.showError('Error ao fazer login, tente novamente mais tarde!');
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
        this.inputPasswordRef.validate();
        hasErrors = this.inputPasswordRef.hasError;
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
