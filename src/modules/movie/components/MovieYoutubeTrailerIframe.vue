<template v-if="convertedUrl">
  <div class="q-mx-lg">
    <iframe
      :width="width"
      height="315"
      :src="convertedUrl"
      title="YouTube video player"
      frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
    ></iframe>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  url: string;
  width?: string;
}

const props = withDefaults(defineProps<Props>(), {
  width: '560',
});

const convertedUrl = computed(() => {
  if (props.url) {
    return getUrlConverted(props.url);
  }
  return '';
});

function getUrlConverted(url: string) {
  const split = url.split(/(vi\/|v=|\/b\/|youtu\.be\/|\/embed\/)/);

  const param = split[2]
    ? split[2].split(/[^0-9a-z_-]/i)[0]
    : split[0]
      ? split[0].split(/[^0-9a-z_-]/i)[0]
      : '';
  return param ? `https://www.youtube.com/embed/${param}` : undefined;
}
</script>
