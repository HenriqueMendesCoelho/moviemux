<template>
  <BaseContainerMain
    ><header class="mm-page-heading">
      <p class="mm-eyebrow">CONTROLE DA COMUNIDADE</p>
      <h1>Administração</h1>
      <p class="mm-muted">Pessoas, permissões e convites em um só lugar.</p>
    </header>
    <nav class="mm-tabs" aria-label="Administração">
      <button
        v-for="item in tabs"
        :key="item.id"
        class="mm-btn"
        :class="{ 'mm-btn-primary': tab === item.id }"
        :aria-pressed="tab === item.id"
        @click="tab = item.id"
      >
        {{ item.label }}
      </button>
    </nav>
    <section ref="panel" tabindex="-1" class="mm-card mm-admin-panel">
      <AdministratorUserTab v-if="tab === 'users'" /><AdministratorListUserTab
        v-else-if="tab === 'listUsers'"
      /><AdministratorInviteUserTab v-else />
    </section>
  </BaseContainerMain>
</template>
<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import BaseContainerMain from 'src/core/components/BaseContainerMain.vue';
import AdministratorUserTab from '../components/AdministratorUserTab.vue';
import AdministratorListUserTab from '../components/AdministratorListUserTab.vue';
import AdministratorInviteUserTab from '../components/AdministratorInviteUserTab.vue';
const tab = ref('users');
const tabs = [
  { id: 'users', label: 'Gerenciar usuário' },
  { id: 'listUsers', label: 'Todos os usuários' },
  { id: 'invite', label: 'Convites' },
];
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
.mm-admin-panel {
  margin-top: 1.5rem;
  padding: clamp(1rem, 2vw, 1.5rem);
}
.mm-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
}
</style>
