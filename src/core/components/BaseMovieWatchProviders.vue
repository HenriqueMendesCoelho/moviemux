<template>
  <section class="mm-providers" aria-label="Onde assistir">
    <h3>Onde assistir no Brasil</h3>
    <p v-if="loading" role="status">Buscando plataformas…</p>
    <p v-else-if="error" class="mm-muted">
      Não foi possível consultar as plataformas.
      <button type="button" class="mm-button mm-button-ghost" @click="load">
        Tentar novamente
      </button>
    </p>
    <template v-else
      ><div class="mm-provider-groups">
        <div v-for="group in groups" :key="group.key">
          <template v-if="providers?.[group.key]?.length"
            ><h4>{{ group.title }}</h4>
            <div class="mm-provider-list">
              <figure v-for="provider in providers[group.key]" :key="provider.provider_id">
                <img
                  :src="`${imageBase}/w92${provider.logo_path}`"
                  :alt="provider.provider_name"
                  :title="provider.provider_name"
                  loading="lazy"
                />
                <figcaption>{{ provider.provider_name }}</figcaption>
              </figure>
            </div></template
          >
        </div>
      </div>
      <p v-if="!hasProviders" class="mm-muted">Nenhuma plataforma informada para este filme.</p>
      <a v-if="providers?.link" :href="providers.link" target="_blank" rel="noopener noreferrer"
        >Consultar disponibilidade no TMDB <BaseIcon name="arrow" /></a
    ></template>
  </section>
</template>
<script setup lang="ts">
import BaseIcon from './BaseIcon.vue';
import { useRuntimeConfig } from '#imports';
const imageBase = String(useRuntimeConfig().public.tmdbImageBase).replace(/\/$/, '');
import { computed, ref, watch, onMounted } from 'vue';
import KitService from 'src/core/services/KitService';
import type { MovieWatchProvider } from 'src/core/types/movie/MovieType';
const props = defineProps<{ tmdbId?: number }>();
const result = ref<MovieWatchProvider>(),
  loading = ref(false),
  error = ref(false);
const providers = computed(() => result.value?.results.BR);
const groups = [
  { key: 'flatrate', title: 'Streaming' },
  { key: 'rent', title: 'Alugar' },
  { key: 'buy', title: 'Comprar' },
] as const;
const hasProviders = computed(() => groups.some((group) => providers.value?.[group.key]?.length));
let request = 0;
async function load() {
  const id = ++request;
  result.value = undefined;
  error.value = false;
  if (!props.tmdbId) {
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    const value = await KitService.getWatchProviders(props.tmdbId);
    if (id === request) result.value = value;
  } catch {
    if (id === request) error.value = true;
  } finally {
    if (id === request) loading.value = false;
  }
}
onMounted(load);
watch(() => props.tmdbId, load);
</script>
<style scoped>
.mm-provider-groups,
.mm-provider-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
.mm-provider-list figure {
  margin: 0;
  max-width: 70px;
  text-align: center;
}
.mm-provider-list img {
  width: 42px;
  height: 42px;
  border-radius: 10px;
}
.mm-provider-list figcaption {
  font-size: 0.65rem;
  opacity: 0.7;
  margin-top: 4px;
}
.mm-providers h4 {
  font-size: 0.8rem;
  margin: 12px 0;
}
</style>
