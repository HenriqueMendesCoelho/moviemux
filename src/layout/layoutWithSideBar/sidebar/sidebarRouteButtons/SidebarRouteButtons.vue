<template>
  <div v-for="(route, index) in routes" :key="route.text" :class="`${index === 0 && 'q-mt-sm'}`">
    <router-link
      v-if="(userStore.isAdmin && route.isAdm) || !route.isAdm"
      :to="route.to"
      class="button"
      :class="`${route.badge && 'relative-position'}`"
    >
      <q-badge v-if="route.badge" class="q-mr-sm" :label="route.badge" :color="route.badgeColor || 'kb-primary'" rounded floating />
      <span class="material-icons">{{ route.icon }}</span>
      <span class="text" v-if="props.showTextsSideBar">{{ route.text }}</span>
      <CustomTooltip class="text-uppercase" anchor="top right" :offset="[35, 0]" v-if="!isSideBarExpanded" :delay="500">{{
        route.text
      }}</CustomTooltip>
    </router-link>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useStyleStore } from 'src/stores/StyleStore';
import { useUserStore } from 'src/stores/UserStore';

import CustomTooltip from 'src/components/shared/customTooltip/CustomTooltip.vue';

type RouteType = {
  to: {
    name: string;
  };
  icon: string;
  text: string;
  isAdm: boolean;
  badge?: string;
  badgeColor?: string;
}[];

const props = defineProps<{
  showTextsSideBar: boolean;
}>();

const userStore = useUserStore();
const styleStore = useStyleStore();
const isSideBarExpanded = computed(() => styleStore.layoutSettings.isSideBarExpanded);
const routes: RouteType = [
  {
    to: { name: 'home' },
    icon: 'home',
    text: 'Home',
    isAdm: false,
  },
  {
    to: { name: 'adm' },
    icon: 'admin_panel_settings',
    text: 'Painel ADM',
    isAdm: true,
  },
  {
    to: { name: 'profile' },
    icon: 'person',
    text: 'Perfil',
    isAdm: false,
  },
  {
    to: { name: 'add' },
    icon: 'add',
    text: 'Adicionar Filme',
    isAdm: false,
  },
  {
    to: { name: 'charts' },
    icon: 'dashboard',
    text: 'Dashboard',
    isAdm: false,
  },
  {
    to: { name: 'discoverMovies' },
    icon: 'search',
    text: 'Descobrir Filmes',
    isAdm: false,
  },
  {
    to: { name: 'wishlist' },
    icon: 'list',
    text: 'Lista de Filmes',
    isAdm: false,
  },
];
</script>

<style lang="scss" scoped>
@import '../scss/sidebar.scss';
</style>
