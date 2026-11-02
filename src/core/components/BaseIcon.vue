<script setup lang="ts">
const paths = {
  arrow: 'M7 17 17 7 M7 7h10v10',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  theme: 'M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z',
  download: 'M12 3v12 M7 10l5 5 5-5 M4 17v4h16v-4',
  close: 'M6 6l12 12 M6 18 18 6',
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
