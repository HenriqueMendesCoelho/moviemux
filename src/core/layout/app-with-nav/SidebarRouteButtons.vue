<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
import { useUserStore } from '~/core/stores/UserStore';
defineProps<{ showTextsSideBar?: boolean }>();
const user = useUserStore();
const links = [
  {
    name: 'home',
    label: 'shell.home',
    path: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  },
  {
    name: 'movie-discover',
    label: 'shell.discover',
    path: 'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  },
  {
    name: 'movie-watchlist-list',
    label: 'shell.watchlists',
    path: 'M8 5h13 M8 12h13 M8 19h13 M3 5h.01 M3 12h.01 M3 19h.01',
  },
  { name: 'movie-charts', label: 'shell.statistics', path: 'M4 20V10 M10 20V4 M16 20v-7 M22 20V7' },
  { name: 'add', label: 'shell.addMovie', path: 'M12 5v14 M5 12h14' },
  {
    name: 'adm',
    label: 'shell.admin',
    path: 'M12 3l9 4v6c0 5-9 9-9 9S3 18 3 13V7z M9 12l2 2 4-4',
    admin: true,
  },
];
</script>
<template>
  <nav :aria-label="t('shell.navigation')">
    <template v-for="link in links" :key="link.name"
      ><NuxtLink v-if="!link.admin || user.isAdmin" :to="{ name: link.name }" class="mm-nav-link"
        ><svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path :d="link.path" /></svg
        >{{ t(link.label) }}</NuxtLink
      ></template
    >
  </nav>
</template>
