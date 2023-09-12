<template>
  <div class="row items-center justify-center full-height">
    <div class="col-md-6 col-xs-12">
      <div class="row justify-center">
        <h1 class="text-white desktop-only text-h2">Bem-vindo ao Cineminha!</h1>
        <SeparatorDivLineSolid class="q-my-md desktop-only" style="opacity: 60%" />
        <img
          class="left-img-login col-md-auto col-xs-6"
          src="../../assets/logo-kronus.png"
          alt="logo"
          draggable="false"
          @click="tab = 'login'"
        />
        <div class="col-12" />
        <p class="q-mt-xl desktop-only" style="font-size: smaller; color: white">Powered by Kronus Platform</p>
      </div>
    </div>
    <div class="col-md-5 col-xs-12 row justify-center">
      <FormLogin class="col-md-6 col-xs-12 q-pa-xs" v-model="tab" />
    </div>
    <div class="absolute-bottom cursor-pointer desktop-only" @click="openURL('https://www.themoviedb.org/?language=pt-BR')">
      <div class="row justify-center">
        <div class="col-auto">
          <img class="" src="../../assets/tmdb-logo-long.svg" style="height: 20px" />
        </div>
        <div class="col-12"></div>
        <div class="col-auto">
          <p class="q-mt-xs" style="font-size: smaller; color: white">
            This product uses the TMDB API but is not endorsed or certified by TMDB.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onActivated, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { openURL } from 'quasar';

import { useUserStore } from 'src/stores/UserStore';

import FormLogin from './formLogin/FormLogin.vue';
import SeparatorDivLineSolid from '../shared/separator/SeparatorDivLineSolid.vue';

const userStore = useUserStore();
const router = useRouter();

const user = computed(() => userStore.user);

const tab = ref('login');

onActivated(() => {
  document.title = 'Cineminha - Login';
});

onMounted(() => {
  if (user.value.isLoged) {
    router.push('/home');
  }
});
</script>

<style lang="scss" scoped>
.left-img-login {
  border-radius: 50%;

  cursor: pointer;

  &:hover {
    box-shadow: 0px 0px 30px -12px var(--primary);
    transition: 0.2s ease-in-out;
  }
}
</style>
