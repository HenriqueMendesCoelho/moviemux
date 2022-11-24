<template>
  <SideBar />
  <router-view />
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import SideBar from '@/components/shared/sidebar/SideBar.vue';

export default defineComponent({
  name: 'LayoutWithSideBar',
  components: {
    SideBar,
  },
});
</script>
