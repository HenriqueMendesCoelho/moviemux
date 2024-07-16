<template>
  <div class="row justify-center items-center">
    <router-link :to="{ name: 'movie', params: { id: id } }" class="container-img" style="border-radius: 50px">
      <BaseCardImage class="card" :src="url" height="90%" :width="getWidth()" :animate="false"></BaseCardImage>
      <figcaption class="ellipsis" :style="`max-width: ${getWidth()};`">{{ props.title }}</figcaption>
      <ContextMenuHome :movie-id="id || ''" />
    </router-link>
  </div>
</template>

<script lang="ts" setup>
import { useQuasar } from 'quasar';

import ContextMenuHome from '../../contextMenuHome/ContextMenuHome.vue';
import BaseCardImage from 'src/core/components/BaseCardImage.vue';

interface Props {
  id: string | undefined;
  url: string | undefined;
  title: string | undefined;
}

const props = defineProps<Props>();
const $q = useQuasar();
const isMobile = $q.platform.is.mobile;

function getWidth() {
  if (isMobile) {
    return '75px';
  }

  return '200px';
}
</script>

<style lang="scss" scoped>
.container-img {
  text-decoration: none;
  color: var(--light-grey2);
}

.card {
  &:hover {
    transform: scale(1.02);
  }
}
</style>
