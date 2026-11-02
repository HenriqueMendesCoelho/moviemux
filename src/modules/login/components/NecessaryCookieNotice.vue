<template>
  <aside v-if="!acknowledged" class="mm-cookie-notice" aria-label="Cookies necessários">
    <p>
      Usamos cookies necessários para manter sua sessão e proteger o acesso à sua conta. “Entendi”
      apenas confirma a leitura deste aviso.
    </p>
    <button type="button" class="mm-button mm-button-ghost" @click="acknowledge">Entendi</button>
  </aside>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';
const storageKey = 'moviemux:necessary-cookie-notice:v1';
const acknowledged = ref(false);
onMounted(() => {
  try {
    acknowledged.value = localStorage.getItem(storageKey) === 'acknowledged';
  } catch {
    // Storage may be unavailable; the notice remains usable without persistence.
  }
});
function acknowledge() {
  acknowledged.value = true;
  try {
    localStorage.setItem(storageKey, 'acknowledged');
  } catch {
    // Acknowledgement still works for the current visit.
  }
}
</script>
<style scoped>
.mm-cookie-notice {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  padding-block: 0.75rem;
  border-block: 1px solid var(--mm-border);
  color: var(--mm-muted);
  font-size: 0.8rem;
}
p {
  flex: 1 1 18rem;
  margin: 0;
  line-height: 1.6;
}
button {
  min-height: 44px;
}
</style>
