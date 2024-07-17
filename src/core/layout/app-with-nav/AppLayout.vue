<template>
  <MobileToolbar class="mobile-only" />
  <SideBar />
  <div class="container-layout scroll" ref="containerLayoutRef" :class="getClass()">
    <router-view v-slot="{ Component }">
      <KeepAlive :include="['HomePage', 'DiscoverMoviesPage']">
        <component :is="Component" />
      </KeepAlive>
    </router-view>
  </div>
  <LoginDialog v-model="showDialogLogin" :actionLogin="login" />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useQuasar } from 'quasar';

import { useUserStore } from 'src/core/stores/UserStore';
import { useStyleStore } from 'src/core/stores/StyleStore';

import SideBar from './SideBar.vue';
import LoginDialog from 'src/modules/login/components/LoginDialog.vue';
import MobileToolbar from './MobileToolbar.vue';

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
.container-layout {
  height: 100vh;
  height: 100dvh;
}
</style>
