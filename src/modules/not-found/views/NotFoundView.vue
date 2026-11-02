<template>
  <main class="mm-not-found">
    <p class="mm-eyebrow">CENA NÃO ENCONTRADA</p>
    <p class="mm-error-code" aria-hidden="true">404</p>
    <h1>Esse filme saiu de cartaz.</h1>
    <p class="mm-muted">A página que você procurou não está aqui.</p>
    <router-link :to="target" class="mm-btn mm-btn-primary">Voltar ao início</router-link>
    <p v-if="!paused" class="mm-muted">Voltando automaticamente em {{ counter }} segundos.</p>
    <button class="mm-link" v-if="!paused" @click="pause">Permanecer nesta página</button>
  </main>
</template>
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from 'src/core/stores/UserStore';
const router = useRouter();
const store = useUserStore();
const counter = ref(10);
const paused = ref(false);
let interval: ReturnType<typeof setInterval> | undefined;
const target = computed(() => (store.user.isLoged ? '/home' : '/'));
function pause() {
  paused.value = true;
  if (interval) clearInterval(interval);
}
onMounted(() => {
  interval = setInterval(() => {
    counter.value--;
    if (counter.value <= 0) {
      pause();
      void router.replace(target.value);
    }
  }, 1000);
});
onUnmounted(() => {
  if (interval) clearInterval(interval);
});
</script>
<style scoped>
.mm-not-found {
  min-height: 100dvh;
  display: grid;
  place-content: center;
  justify-items: center;
  text-align: center;
  padding: 2rem;
  gap: 1rem;
}
.mm-error-code {
  font-size: clamp(6rem, 25vw, 18rem);
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.08em;
  opacity: 0.15;
}
.mm-not-found h1 {
  font-size: clamp(1.8rem, 4vw, 3rem);
}
</style>
