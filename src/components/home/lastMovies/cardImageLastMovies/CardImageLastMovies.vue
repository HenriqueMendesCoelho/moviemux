<template>
  <div class="row justify-center items-center">
    <router-link :to="{ name: 'movie', params: { id: id } }" class="container-img" style="border-radius: 50px">
      <CardImage class="card" :src="url" height="95%" :width="getWidth()" :animate="false"> </CardImage>
      <figcaption>{{ getTitle() }}</figcaption>
      <ContextMenuHome :movie-id="id || ''" />
    </router-link>
  </div>
</template>

<script lang="ts" setup>
import { useQuasar } from 'quasar';

import ContextMenuHome from '../../contextMenuHome/ContextMenuHome.vue';
import CardImage from 'src/components/shared/cardImage/CardImage.vue';

interface Props {
  id: string | undefined;
  url: string | undefined;
  title: string | undefined;
}

const props = defineProps<Props>();
const $q = useQuasar();

const isMobile = $q.platform.is.mobile;

function getTitle(): string | void {
  if (!props.title) {
    return;
  }
  const size = isMobile ? 12 : 20;

  if (props.title.length > size) {
    return `${props.title.slice(0, size - 3)}...`;
  }

  return props.title;
}
function getWidth() {
  if (isMobile) {
    return '75px';
  }

  return '210px';
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
