<template>
  <main>
    <LoginAnimation />
    <div class="row items-center" style="height: 100%">
      <div class="col-6">
        <div class="row justify-center">
          <h2 style="color: white">Bem-vindo ao Cineminha!</h2>
          <SeparatorDivLineSolid class="q-my-md" style="opacity: 60%" />
          <img src="@/assets/logo-kronus.png" class="left-img-login" alt="logo" draggable="false" @click="tab = 'login'" />
          <div class="col-12" />
          <p class="q-mt-xl" style="font-size: smaller; color: white">Powered by Kronus Platform</p>
        </div>
      </div>
      <div class="col-6">
        <FormLogin v-model="tab" :actionLogin="login" />
      </div>
    </div>
  </main>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import FormLogin from './FormLogin.vue';
import SeparatorDivLineSolid from '../shared/separator/SeparatorDivLineSolid.vue';

export default defineComponent({
  name: 'LoginPage',
  components: {
    FormLogin,
    SeparatorDivLineSolid,
  },
  setup() {
    document.title = 'Cineminha - Login';
  },
  data() {
    return {
      button_text: 'Login',
      input_pass: '',
      input_email: '',
      input_code: '',
      tab: 'login',
    };
  },
  methods: {
    routeToLogin() {
      this.$router.push({ name: 'home' });
    },
    login() {
      this.$router.push('/home');
    },
  },
});
</script>

<style lang="scss" scoped>
main {
  height: 100%;
  overflow: hidden;
  .left-img-login {
    border-radius: 50%;

    &:hover {
      box-shadow: 0px 0px 30px -12px var(--primary);
      transition: 0.2s ease-in-out;
    }
  }
}
</style>
