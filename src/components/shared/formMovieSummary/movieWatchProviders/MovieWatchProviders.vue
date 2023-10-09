<template>
  <div>
    <q-spinner color="kb-primary" size="xl" v-if="!watchProviders?.results" />
    <div class="row no-wrap scroll q-gutter-lg">
      <div class="col-auto" v-if="watchProviders?.results['BR']?.flatrate?.length">
        <div class="text-h6">Stream</div>
        <div class="row no-wrap q-py-xs q-gutter-sm">
          <div v-for="provider in watchProviders?.results['BR']?.flatrate" :key="provider.provider_id">
            <q-avatar><img :src="getURL(provider.logo_path)" /></q-avatar>
            <CustomTooltip delay="400">{{ provider.provider_name }}</CustomTooltip>
          </div>
        </div>
      </div>
      <q-separator
        dark
        vertical
        inset
        v-if="
          (watchProviders?.results['BR']?.rent?.length && watchProviders?.results['BR'].flatrate?.length) ||
          (watchProviders?.results['BR']?.buy?.length && watchProviders?.results['BR'].flatrate?.length)
        "
      />
      <div class="col-auto" v-if="watchProviders?.results['BR']?.rent?.length">
        <div class="text-h6">Alugar</div>
        <div class="row no-wrap q-py-xs q-gutter-sm">
          <div v-for="provider in watchProviders?.results['BR']?.rent" :key="provider.provider_id">
            <q-avatar><img :src="getURL(provider.logo_path)" /></q-avatar>
            <CustomTooltip delay="400">{{ provider.provider_name }}</CustomTooltip>
          </div>
        </div>
      </div>
      <q-separator dark vertical inset v-if="watchProviders?.results['BR']?.buy?.length && watchProviders?.results['BR'].rent?.length" />
      <div class="col-auto" v-if="watchProviders?.results['BR']?.buy?.length">
        <div class="text-h6">Comprar</div>
        <div class="row no-wrap q-py-xs q-gutter-sm">
          <div v-for="provider in watchProviders?.results['BR'].buy" :key="provider.provider_id">
            <q-avatar><img :src="getURL(provider.logo_path)" /></q-avatar>
            <CustomTooltip delay="400">{{ provider.provider_name }}</CustomTooltip>
          </div>
        </div>
      </div>
      <div
        v-if="
          !watchProviders?.results['BR']?.buy?.length &&
          !watchProviders?.results['BR']?.flatrate?.length &&
          !watchProviders?.results['BR']?.rent?.length &&
          watchProviders?.results
        "
      >
        <q-icon name="cloud_off" size="md" color="white" />
        <CustomTooltip delay="400">Sem informações das plataformas dísponiveis no Brasil</CustomTooltip>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onBeforeMount } from 'vue';

import { MovieWatchProvider } from 'src/types/movie/MovieType';

import KitService from 'src/services/KitService';

import CustomTooltip from 'src/components/shared/customTooltip/CustomTooltip.vue';

interface Props {
  tmdbId?: number;
}

const props = defineProps<Props>();

const watchProviders = ref<MovieWatchProvider | undefined>();

onBeforeMount(() => {
  watchProviders.value = undefined;
});

onMounted(async () => {
  watchProviders.value = undefined;
  if (props.tmdbId) {
    await loadWatchProviders();
  }
});

watch(
  () => props.tmdbId,
  async (val) => {
    watchProviders.value = undefined;
    if (val) await loadWatchProviders();
  }
);

async function loadWatchProviders(): Promise<void> {
  if (!props?.tmdbId) {
    return;
  }
  try {
    const res = await KitService.getWatchProviders(props.tmdbId);
    watchProviders.value = res;
  } catch {}
}
function getURL(path: string) {
  return `https://image.tmdb.org/t/p/original/${path}`;
}
</script>
