<template>
  <main class="flex flex-center">
    <div class="row justify-center">
      <div>
        <router-link to="/">
          <img src="../../../assets/logo-kronus.png" class="left-img-login" alt="logo" draggable="false" />
        </router-link>
      </div>
      <div class="col-12"></div>
      <p>404,</p>
      <div class="col-12"></div>
      <h1>página não encontrada...</h1>
      <div class="col-12"></div>
      <h4 class="q-mt-md">
        Voltando para o início em <span class="text-kb-primary">{{ counter }}</span> segundos...
      </h4>
    </div>
  </main>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from 'src/core/stores/UserStore';

const router = useRouter();
const counter = ref(10);
let intervalId: number | undefined;
const userStore = useUserStore();

onMounted(() => {
  intervalId = window.setInterval(() => {
    counter.value--;

    if (counter.value <= 0) {
      if (userStore.user.isLoged) {
        router.push('/home');
        return;
      }

      router.push('/');
    }
  }, 1000);
});

onUnmounted(() => {
  if (intervalId !== undefined) {
    clearInterval(intervalId);
  }
});
</script>

<style lang="scss" scoped>
main {
  height: 100vh;
  h1,
  h4 {
    color: white;
  }

  p {
    font-size: 35vh;
    color: white;
  }

  a {
    text-decoration: none;
  }

  .left-img-login {
    width: 12vw;
    border-radius: 50%;

    cursor: pointer;

    &:hover {
      box-shadow: 0px 0px 30px -12px var(--primary);

      transition: 0.2s ease-in-out;
    }
  }
}
</style>
