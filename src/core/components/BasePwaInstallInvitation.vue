<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useNuxtApp } from '#imports';
import BaseIcon from './BaseIcon.vue';
const controller = useNuxtApp().$pwaInstall;
const hydrated = ref(false);
onMounted(() => {
  hydrated.value = true;
});
const available = computed(
  () => hydrated.value && !!controller?.state.available && !controller.state.installed,
);
const feedback = computed(() => (hydrated.value ? controller?.state.feedback || '' : ''));
const install = () => controller?.install();
const dismiss = () => controller?.dismiss();
</script>
<template>
  <aside v-if="available || feedback" class="mm-install-invitation" aria-label="Instalar MovieMux">
    <BaseIcon name="download" />
    <div class="mm-install-copy">
      <template v-if="!feedback">
        <strong>MovieMux no seu dispositivo</strong>
        <p>Abra direto pela tela inicial, com a instalação do navegador.</p>
      </template>
      <p v-else role="status">{{ feedback }}</p>
    </div>
    <div class="mm-install-actions">
      <button v-if="available" type="button" class="mm-button" @click="install">
        Instalar app
      </button>
      <button type="button" class="mm-button mm-button-ghost" @click="dismiss">
        {{ feedback ? 'Fechar' : 'Não mostrar' }}
      </button>
    </div>
  </aside>
</template>
<style scoped>
.mm-install-invitation {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  margin: 0 0 1.5rem;
  padding: 1rem 1.25rem;
  border: 1px solid var(--mm-border);
  border-radius: 1rem;
  background: var(--mm-surface);
  color: var(--mm-text);
  min-width: 0;
}
.mm-install-invitation > svg {
  flex: 0 0 20px;
  color: var(--mm-link);
}
.mm-install-copy {
  flex: 1 1 15rem;
  min-width: 0;
}
.mm-install-copy strong {
  font-size: 0.95rem;
}
.mm-install-copy p {
  margin: 0.25rem 0 0;
  color: var(--mm-muted);
  font-size: 0.85rem;
  line-height: 1.5;
}
.mm-install-actions {
  margin-left: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.mm-install-actions button {
  min-height: 44px;
  white-space: nowrap;
}
@media (max-width: 600px) {
  .mm-install-invitation {
    flex-wrap: wrap;
    gap: 0.75rem;
    padding: 1rem;
  }
  .mm-install-copy {
    flex-basis: calc(100% - 2rem);
  }
  .mm-install-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
