<template>
  <main>
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
        <FormLogin v-model="tab" />
      </div>
      <div class="absolute-bottom">
        <div class="row justify-center">
          <div class="col-auto"><img class="" src="../../assets/tmdb-logo-long.svg" style="height: 20px" /></div>
          <div class="col-12"></div>
          <div class="col-auto"><p class="q-mt-xs" style="font-size: smaller; color: white">We use TMDB API, thanks TMDB!</p></div>
        </div>
      </div>
    </div>
  </main>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import FormLogin from './formLogin/FormLogin.vue';
import SeparatorDivLineSolid from '../shared/separator/SeparatorDivLineSolid.vue';
import { useUserStore } from '@/stores/UserStore';
import { mapState } from 'pinia';

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
      tab: 'login',
    };
  },
  computed: {
    ...mapState(useUserStore, ['user']),
  },
  mounted() {
    if (this.user.isLoged) {
      this.$router.push('/home');
    }
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
