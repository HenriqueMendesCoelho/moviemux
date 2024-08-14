<template>
  <div>
    <div class="outer-sidebar" @click="ToggleMenu" v-if="layoutSettings.isSideBarExpanded && isMobile"></div>
    <aside :class="`${layoutSettings.isSideBarExpanded && 'is-expanded'}`" class="overflow-hidden-y">
      <div class="row logo">
        <router-link to="/home">
          <img src="../../../assets/logo-kronus.png" alt="logo" draggable="false" style="z-index: 11" />
        </router-link>
      </div>
      <div class="menu-toggle-wrap">
        <button class="menu-toggle" @click="ToggleMenu">
          <span class="material-icons"> keyboard_double_arrow_right </span>
        </button>
      </div>
      <p v-if="showTextsSideBar">Olá, {{ user.name }}</p>
      <h3>Menu</h3>
      <div class="menu menu-scroll">
        <SidebarRouteButtons :showTextsSideBar="showTextsSideBar" />
      </div>
      <div class="flex"></div>
      <div class="menu menu-bottom">
        <button class="button" @click="styleStore.darkThemeToggle()">
          <span class="material-icons" draggable="false" v-if="layoutSettings.darkMode"> light_mode </span>
          <span class="material-icons" draggable="false" v-else> dark_mode </span>
          <span class="text" draggable="false" v-if="showTextsSideBar">Tema</span>
          <CustomTooltip anchor="top right" :offset="[30, 0]" v-if="!layoutSettings.isSideBarExpanded" :delay="500">Tema</CustomTooltip>
        </button>
        <router-link @click="logout" to="/" class="button">
          <span class="material-icons">logout</span>
          <span class="text" v-if="showTextsSideBar">Sair</span>
          <CustomTooltip anchor="top right" :offset="[30, 0]" v-if="!layoutSettings.isSideBarExpanded" :delay="500">Sair</CustomTooltip>
        </router-link>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { Cookies, useQuasar } from 'quasar';

import { useUserStore } from 'src/stores/UserStore';
import { useStyleStore } from 'src/stores/StyleStore';

import CustomTooltip from 'src/components/shared/customTooltip/CustomTooltip.vue';
import SidebarRouteButtons from './sidebarRouteButtons/SidebarRouteButtons.vue';

const userStore = useUserStore();
const styleStore = useStyleStore();
const showTextsSideBar = ref(false);
const layoutSettings = computed(() => styleStore.layoutSettings);
const user = computed(() => userStore.user);
const $q = useQuasar();
const isMobile = $q.platform.is.mobile;

onMounted(() => {
  showTextsSideBar.value = layoutSettings.value.isSideBarExpanded;
});

watch(
  () => layoutSettings.value,
  (val) => {
    if (val.isSideBarExpanded) {
      setTimeout(() => {
        showTextsSideBar.value = true;
        return;
      }, 80);
    }
    showTextsSideBar.value = false;
  },
  { deep: true }
);

function ToggleMenu() {
  layoutSettings.value.isSideBarExpanded = !layoutSettings.value.isSideBarExpanded;
}
function logout() {
  userStore.$reset();
  Cookies.remove('auth-kb');
}
</script>

<style lang="scss" scoped>
@import 'scss/sidebar.scss';
</style>
