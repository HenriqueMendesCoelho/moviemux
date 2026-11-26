<template>
  <BaseContainerMain
    ><header class="mm-page-heading">
      <p class="mm-eyebrow">{{ t('account.communityControl') }}</p>
      <h1>{{ t('account.administration') }}</h1>
      <p class="mm-muted">{{ t('account.adminIntro') }}</p>
    </header>
    <nav class="mm-tabs" :aria-label="t('account.administration')">
      <button
        v-for="item in tabs"
        :key="item.id"
        class="mm-btn"
        :class="{ 'mm-btn-primary': tab === item.id }"
        :aria-pressed="tab === item.id"
        :disabled="manualLocked && item.id !== 'manualCatalog'"
        @click="tab = item.id"
      >
        {{ item.label }}
      </button>
    </nav>
    <section ref="panel" tabindex="-1" class="mm-card mm-admin-panel">
      <AdministratorUserTab v-if="tab === 'users'" /><AdministratorListUserTab
        v-else-if="tab === 'listUsers'"
      /><AdministratorInviteUserTab v-else-if="tab === 'invite'" />
      <AdministratorRegistrationTab
        v-else-if="tab === 'registration' && user.user.isLoged && user.isAdmin"
      />
      <AdministratorManualMovieTab
        v-if="user.user.isLoged && user.isAdmin"
        :active="tab === 'manualCatalog'"
        @available="setManualAvailability"
        @select="selectManualTab"
        @locked="manualLocked = $event"
      />
    </section>
  </BaseContainerMain>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
import { computed, ref, watch, nextTick } from 'vue';
import BaseContainerMain from 'src/core/components/BaseContainerMain.vue';
import AdministratorUserTab from '../components/AdministratorUserTab.vue';
import AdministratorListUserTab from '../components/AdministratorListUserTab.vue';
import { useUserStore } from '~/core/stores/UserStore';
import AdministratorRegistrationTab from '../components/AdministratorRegistrationTab.vue';
import AdministratorManualMovieTab from '../components/AdministratorManualMovieTab.vue';
import AdministratorInviteUserTab from '../components/AdministratorInviteUserTab.vue';
const user = useUserStore();
const tab = ref('users');
const manualAvailable = ref(false);
const manualLocked = ref(false);
function setManualAvailability(value: boolean) {
  manualAvailable.value = value;
  if (!value) manualLocked.value = false;
  if (!value && tab.value === 'manualCatalog') tab.value = 'users';
}
function selectManualTab() {
  if (manualAvailable.value) tab.value = 'manualCatalog';
}
const tabs = computed(() => [
  { id: 'users', label: t('account.manageUser') },
  { id: 'listUsers', label: t('account.allUsers') },
  { id: 'invite', label: t('account.invitations') },
  ...(user.user.isLoged && user.isAdmin
    ? [{ id: 'registration', label: t('registrationAdmin.tab') }]
    : []),
  ...(manualAvailable.value && user.user.isLoged && user.isAdmin
    ? [{ id: 'manualCatalog', label: t('manualCatalog.tab') }]
    : []),
]);
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
