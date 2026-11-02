<script setup lang="ts">
import BaseIcon from '~/core/components/BaseIcon.vue';
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useUserStore } from '~/core/stores/UserStore';
import { useStyleStore } from '~/core/stores/StyleStore';
import SidebarRouteButtons from './SidebarRouteButtons.vue';
import logo from '~/assets/logo.webp';
const props = withDefaults(defineProps<{ mobile?: boolean }>(), { mobile: false });
const panel = ref<HTMLElement>();
const pwa = useNuxtApp().$pwa;
const user = useUserStore();
const style = useStyleStore();
const mobileOpen = computed(() => props.mobile && style.layoutSettings.isSideBarExpanded);
let opener: HTMLElement | null = null;
let focusGeneration = 0;
function close() {
  style.layoutSettings.isSideBarExpanded = false;
}
function focusable() {
  return Array.from(
    panel.value?.querySelectorAll<HTMLElement>(
      'a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])',
    ) ?? [],
  ).filter(
    (element) =>
      !element.closest('[inert],[hidden]') &&
      getComputedStyle(element).display !== 'none' &&
      getComputedStyle(element).visibility !== 'hidden',
  );
}
watch(mobileOpen, async (open, wasOpen) => {
  const generation = ++focusGeneration;
  if (open) {
    opener = document.activeElement as HTMLElement | null;
    await nextTick();
    if (generation !== focusGeneration) return;
    if (mobileOpen.value && !document.querySelector('dialog[open]'))
      (focusable()[0] ?? panel.value)?.focus();
  } else if (wasOpen) {
    await nextTick();
    if (generation !== focusGeneration) return;
    if (
      !mobileOpen.value &&
      props.mobile &&
      opener?.isConnected &&
      !document.querySelector('dialog[open]')
    )
      opener.focus();
    opener = null;
  }
});
function keydown(event: KeyboardEvent) {
  if (!mobileOpen.value || document.querySelector('dialog[open]')) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    close();
    return;
  }
  if (event.key !== 'Tab') return;
  const controls = focusable(),
    first = controls[0],
    last = controls.at(-1);
  if (!first) {
    event.preventDefault();
    panel.value?.focus();
    return;
  }
  const active = document.activeElement;
  if (event.shiftKey && (active === first || active === panel.value)) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && (active === last || active === panel.value)) {
    event.preventDefault();
    first.focus();
  }
}
onBeforeUnmount(() => {
  focusGeneration++;
  opener = null;
});
async function logout() {
  close();
  user.logout();
  await navigateTo('/');
}
</script>
<template>
  <button v-if="mobileOpen" class="mm-sidebar-backdrop" aria-label="Fechar menu" @click="close" />
  <aside
    id="primary-sidebar"
    ref="panel"
    class="mm-sidebar"
    :class="{ 'is-open': style.layoutSettings.isSideBarExpanded }"
    :inert="mobile && !mobileOpen"
    :aria-hidden="mobile && !mobileOpen ? true : undefined"
    :role="mobileOpen ? 'dialog' : undefined"
    :aria-modal="mobileOpen ? true : undefined"
    aria-label="Navegação principal"
    tabindex="-1"
    @keydown="keydown"
  >
    <button
      v-if="mobile"
      class="mm-sidebar-close mm-button mm-button-ghost"
      type="button"
      aria-label="Fechar menu de navegação"
      @click="close"
    >
      <BaseIcon name="close" /> Fechar
    </button>
    <NuxtLink to="/home" class="mm-brand"
      ><img :src="logo" alt="" class="mm-original-logo" /><span
        >Movie<span class="mm-accent">Mux</span><small>SEU UNIVERSO DE CINEMA</small></span
      ></NuxtLink
    >
    <p class="mm-nav-caption">BIBLIOTECA PESSOAL</p>
    <SidebarRouteButtons :show-texts-side-bar="true" />
    <div class="mm-sidebar-bottom">
      <button v-if="pwa?.showInstallPrompt" class="mm-nav-link" @click="pwa.install()">
        <BaseIcon name="download" /> Instalar aplicativo
      </button>
      <button class="mm-nav-link" @click="style.darkThemeToggle()">
        <BaseIcon name="theme" />
        {{ style.layoutSettings.darkMode ? 'Modo claro' : 'Modo escuro' }}</button
      ><NuxtLink to="/profile" class="mm-user"
        ><span class="mm-avatar">{{ user.user.name?.slice(0, 1) || 'M' }}</span
        ><span
          >{{ user.user.name || 'Meu perfil' }}<small>Seu espaço de cinema</small></span
        ></NuxtLink
      ><button class="mm-text-button" @click="logout">
        Sair da conta <BaseIcon name="arrow" />
      </button>
    </div>
  </aside>
</template>

<style scoped>
.mm-sidebar {
  overflow-y: auto;
  overscroll-behavior: contain;
}
.mm-sidebar-close {
  align-self: flex-end;
  margin-bottom: 12px;
}
@media (max-width: 760px) {
  .mm-sidebar {
    visibility: hidden;
  }
  .mm-sidebar.is-open {
    visibility: visible;
  }
}
</style>
