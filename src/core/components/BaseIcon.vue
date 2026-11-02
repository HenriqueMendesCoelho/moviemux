<script setup lang="ts">
const paths = {
  arrow: 'M7 17 17 7 M7 7h10v10',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  theme: 'M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z',
  download: 'M12 3v12 M7 10l5 5 5-5 M4 17v4h16v-4',
  close: 'M6 6l12 12 M6 18 18 6',
  refresh: 'M20 7v5h-5 M4 17v-5h5 M6 7a7 7 0 0 1 12-2l2 2 M4 17l2 2a7 7 0 0 0 12-2',
  'chevron-up': 'M6 15l6-6 6 6',
  'chevron-down': 'M6 9l6 6 6-6',
  plus: 'M12 5v14 M5 12h14',
  grip: 'M9 5h.01 M15 5h.01 M9 12h.01 M15 12h.01 M9 19h.01 M15 19h.01',
  edit: 'm16 3 5 5-12 12-6 1 1-6Z M13 6l5 5',
  lock: 'M6 11h12v10H6z M8 11V7a4 4 0 0 1 8 0v4',
  share: 'M12 16V3 M7 8l5-5 5 5 M5 13v8h14v-8',
  'chevron-left': 'M15 6l-6 6 6 6',
  'chevron-right': 'M9 6l6 6-6 6',
  check: 'M5 12l4 4L19 6',
  search: 'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
} as const;
defineProps<{ name: keyof typeof paths }>();
</script>
<template>
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
    style="vertical-align: middle; flex-shrink: 0"
  >
    <path :d="paths[name]" />
  </svg>
</template>
