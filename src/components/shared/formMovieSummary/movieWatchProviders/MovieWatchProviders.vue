<template>
  <div class="row no-wrap scroll q-gutter-lg">
    <div class="col-auto" v-if="watchProviders?.results['BR'].flatrate?.length">
      <div class="text-h6">Stream</div>
      <div class="row no-wrap q-py-xs q-gutter-sm">
        <div v-for="provider in watchProviders?.results['BR'].flatrate" :key="provider.provider_id">
          <q-avatar><img :src="getURL(provider.logo_path)" /></q-avatar>
          <CustomTooltip delay="400">{{ provider.provider_name }}</CustomTooltip>
        </div>
      </div>
    </div>
    <q-separator dark vertical inset v-if="watchProviders?.results['BR'].rent?.length" />
    <div class="col-auto" v-if="watchProviders?.results['BR'].rent?.length">
      <div class="text-h6">Alugar</div>
      <div class="row no-wrap q-py-xs q-gutter-sm">
        <div v-for="provider in watchProviders?.results['BR'].rent" :key="provider.provider_id">
          <q-avatar><img :src="getURL(provider.logo_path)" /></q-avatar>
          <CustomTooltip delay="400">{{ provider.provider_name }}</CustomTooltip>
        </div>
      </div>
    </div>
    <q-separator dark vertical inset v-if="watchProviders?.results['BR'].buy?.length" />
    <div class="col-auto" v-if="watchProviders?.results['BR'].buy?.length">
      <div class="text-h6">Comprar</div>
      <div class="row no-wrap q-py-xs q-gutter-sm">
        <div v-for="provider in watchProviders?.results['BR'].buy" :key="provider.provider_id">
          <q-avatar><img :src="getURL(provider.logo_path)" /></q-avatar>
          <CustomTooltip delay="400">{{ provider.provider_name }}</CustomTooltip>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeMount, ref } from 'vue';
import { useQuasar } from 'quasar';

import { MovieWatchProvider } from 'src/types/movie/MovieType';

import CustomTooltip from 'src/components/shared/customTooltip/CustomTooltip.vue';

import KitService from 'src/services/KitService';

const $q = useQuasar();

interface Props {
  tmdbId?: number;
}

const props = defineProps<Props>();

const watchProviders = ref<MovieWatchProvider>();

onBeforeMount(async () => {
  await loadWatchProviders();
});

function showLoading() {
  $q.loading.show({
    spinnerColor: 'kb-primary',
  });
}
function hideLoading() {
  $q.loading.hide();
}

async function loadWatchProviders(): Promise<void> {
  if (!props?.tmdbId) {
    return;
  }
  try {
    showLoading();
    const res = await KitService.getWatchProviders(props.tmdbId);
    watchProviders.value = res;
  } finally {
    hideLoading();
  }
}
function getURL(path: string) {
  return `https://image.tmdb.org/t/p/original/${path}`;
}
</script>
