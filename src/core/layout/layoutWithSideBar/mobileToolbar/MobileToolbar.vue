<template>
  <q-toolbar class="bg-grey-mid text-white row toolbar text-white relative-position" v-show="isSideBarNotExpanded">
    <q-btn @click="showSidebar" icon="menu" size="md" round flat />
    <div class="absolute-center">
      <router-link to="/home">
        <q-btn round>
          <q-avatar>
            <img src="../../../../assets/logo-kronus.png" draggable="false" />
          </q-avatar>
        </q-btn>
      </router-link>
    </div>
    <div class="flex" />
    <router-link :to="{ name: 'login' }">
      <q-btn @click="logout" icon="logout" size="md" round flat />
    </router-link>
  </q-toolbar>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Cookies } from 'quasar';

import { useStyleStore } from 'src/core/stores/StyleStore';
import { useUserStore } from 'src/core/stores/UserStore';

const userStore = useUserStore();
const styleStore = useStyleStore();

const layoutSettings = computed(() => styleStore.layoutSettings);
const isSideBarNotExpanded = computed(() => !styleStore.layoutSettings.isSideBarExpanded);

function showSidebar() {
  layoutSettings.value.isSideBarExpanded = true;
}
function logout() {
  userStore.$reset();
  Cookies.remove('auth-kb');
}
</script>

<style lang="scss" scoped>
.toolbar {
  position: fixed;
  z-index: 10;
}

a,
a:visited,
a:hover,
a:active {
  color: inherit;
}

.flex {
  flex: 1 1 0;
}
</style>
