<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import SideBar from './SideBar.vue';
import MobileToolbar from './MobileToolbar.vue';
import LoginDialog from '~/modules/login/components/LoginDialog.vue';
import { useUserStore } from '~/core/stores/UserStore';
import { useStyleStore } from '~/core/stores/StyleStore';
const user = useUserStore();
const style = useStyleStore();
const route = useRoute();
const mobile = ref(false);
const mobileDrawerOpen = computed(() => mobile.value && style.layoutSettings.isSideBarExpanded);
let media: MediaQueryList | undefined;
let restoreOverflow: string | undefined;
function syncViewport() {
  mobile.value = media?.matches ?? false;
}
function syncScroll(open: boolean) {
  if (open && restoreOverflow === undefined) {
    restoreOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  } else if (!open && restoreOverflow !== undefined) {
    document.body.style.overflow = restoreOverflow;
    restoreOverflow = undefined;
  }
}
onMounted(() => {
  media = window.matchMedia('(max-width: 760px)');
  syncViewport();
  media.addEventListener('change', syncViewport);
  syncScroll(mobileDrawerOpen.value);
});
watch(mobileDrawerOpen, (open) => {
  if (typeof document !== 'undefined') syncScroll(open);
});
watch(
  () => user.showDialogLogin,
  (open) => {
    if (open) style.layoutSettings.isSideBarExpanded = false;
  },
);
onBeforeUnmount(() => {
  media?.removeEventListener('change', syncViewport);
  if (typeof document !== 'undefined') syncScroll(false);
});
watch(
  () => route.fullPath,
  () => {
    style.layoutSettings.isSideBarExpanded = false;
  },
);
</script>
<template>
  <div class="mm-app-shell">
    <SideBar :mobile="mobile" />
    <div class="mm-workspace" :inert="mobileDrawerOpen">
      <MobileToolbar />
      <main id="main-content" class="mm-main"><slot /></main>
    </div>
    <LoginDialog v-model="user.showDialogLogin" :action-login="() => {}" />
  </div>
</template>
