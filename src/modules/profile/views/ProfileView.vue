<template>
  <BaseContainerMain
    ><header class="mm-page-heading">
      <p class="mm-eyebrow">SEU ESPAÇO</p>
      <h1>Meu perfil</h1>
      <p class="mm-muted">Sua identidade, preferências e segurança.</p>
    </header>
    <nav class="mm-tabs" aria-label="Configurações do perfil">
      <button
        class="mm-btn"
        :class="{ 'mm-btn-primary': tab === 'myData' }"
        :aria-pressed="tab === 'myData'"
        @click="tab = 'myData'"
      >
        Meus dados</button
      ><button
        class="mm-btn"
        :class="{ 'mm-btn-primary': tab === 'security' }"
        :aria-pressed="tab === 'security'"
        @click="tab = 'security'"
      >
        Segurança
      </button>
    </nav>
    <section ref="panel" tabindex="-1" class="mm-card mm-profile-panel">
      <PanelProfile v-if="tab === 'myData'" /><PanelSecurityProfile v-else />
    </section>
  </BaseContainerMain>
</template>
<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import BaseContainerMain from 'src/core/components/BaseContainerMain.vue';
import PanelProfile from '../components/PanelProfile.vue';
import PanelSecurityProfile from '../components/PanelSecurityProfile.vue';
const tab = ref('myData');
const panel = ref<HTMLElement>();
watch(tab, async () => {
  await nextTick();
  const heading = panel.value?.querySelector<HTMLElement>('h2');
  if (heading) {
    heading.tabIndex = -1;
    heading.focus();
  } else panel.value?.focus();
});
</script>
<style scoped>
.mm-tabs {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}
.mm-profile-panel {
  margin-top: 1.5rem;
  padding: clamp(1rem, 2vw, 1.5rem);
}
</style>
