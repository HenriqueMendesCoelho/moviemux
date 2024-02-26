<template>
  <MobileToolbar class="mobile-only" />
  <SideBar />
  <div ref="containerLayoutRef" :class="getClass()" class="scroll" style="height: 100vh">
    <router-view v-slot="{ Component }">
      <KeepAlive :include="['HomePage', 'DiscoverMoviesPage']">
        <component :is="Component" />
      </KeepAlive>
    </router-view>
  </div>
  <DialogLogin v-model="showDialogLogin" :actionLogin="login" />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useQuasar } from 'quasar';

import { useUserStore } from 'src/stores/UserStore';
import { useStyleStore } from 'src/stores/StyleStore';

import SideBar from './sidebar/SideBar.vue';
import DialogLogin from 'src/components/login/DialogLogin.vue';
import MobileToolbar from './mobileToolbar/MobileToolbar.vue';

const $q = useQuasar();
const isMobile = $q.platform.is.mobile;

const userStore = useUserStore();

const user = computed(() => userStore.user);
const showDialogLogin = computed(() => userStore.showDialogLogin);

const containerLayoutRef = ref();
const styleStore = useStyleStore();
const isSideBarExpanded = computed(() => styleStore.layoutSettings.isSideBarExpanded);

styleStore.$onAction(({ name, args }) => {
  if (name === 'scrollToContainer') {
    containerLayoutRef.value?.scrollTo({
      top: args[0],
      left: args[1],
      behavior: args[2],
    });
  }
});

function login() {
  user.value.isLoged = false;
}
function getClass() {
  if (isMobile) {
    return;
  }

  return isSideBarExpanded.value ? 'expanded-sidebar' : 'not-expanded-sidebar';
}
</script>

<style lang="scss" scoped>
.expanded-sidebar {
  margin-left: 320px;
  min-width: calc(100vw - 320px);
  transition: 0.2s ease-out;
}

.not-expanded-sidebar {
  margin-left: 7rem;
  min-width: calc(100vw - 7rem);
  transition: 0.2s ease-out;
}
</style>
