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

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'VideoEmbedded',
  props: {
    url: {
      type: String,
      required: true,
    },
    width: {
      type: String,
      default: '560',
    },
  },
  data() {
    return {
      isYoutubeUrl: true,
    };
  },
  computed: {
    convertedUrl() {
      return this.getUrlConverted(this.url);
    },
  },
  methods: {
    getUrlConverted(url: string) {
      const split = url.split(/(vi\/|v=|\/v\/|youtu\.be\/|\/embed\/)/);

      const param =
        // eslint-disable-next-line
        split[2] !== undefined ? split[2].split(/[^0-9a-z_\-]/i)[0] : split[0];

      return param ? `https://www.youtube.com/embed/${param}` : undefined;
    },
  },
});
</script>

<style></style>
