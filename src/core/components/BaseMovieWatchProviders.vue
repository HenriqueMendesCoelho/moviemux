<template>
  <section class="mm-providers" aria-label="Onde assistir no Brasil" :aria-busy="loading">
    <header class="mm-providers-heading">
      <h3>Onde assistir</h3>
      <span class="mm-provider-country">Brasil</span>
    </header>
    <div v-if="loading" class="mm-provider-loading">
      <p class="mm-provider-status" role="status">Buscando plataformas…</p>
      <div class="mm-provider-skeleton" aria-hidden="true">
        <i />
        <div><span /><span /><span /></div>
      </div>
    </div>
    <div v-else-if="error" class="mm-provider-status" role="alert">
      <p>Não foi possível consultar as plataformas.</p>
      <button type="button" class="mm-button mm-button-ghost" @click="load">
        Tentar novamente
      </button>
    </div>
    <template v-else>
      <div v-if="hasProviders" class="mm-provider-groups">
        <section
          v-for="group in availableGroups"
          :key="group.key"
          class="mm-provider-category"
          :aria-label="group.title"
        >
          <h4>{{ group.title }}</h4>
          <p class="mm-provider-description">{{ group.description }}</p>
          <ul class="mm-provider-list">
            <li v-for="provider in providers?.[group.key]" :key="provider.provider_id">
              <figure>
                <img
                  v-if="provider.logo_path && !failedLogos.has(provider.logo_path)"
                  :src="`${imageBase}/w92${provider.logo_path}`"
                  alt=""
                  width="48"
                  height="48"
                  loading="lazy"
                  @error="failedLogos.add(provider.logo_path)"
                />
                <span v-else class="mm-provider-no-logo" aria-hidden="true">TV</span>
                <figcaption>{{ provider.provider_name }}</figcaption>
              </figure>
            </li>
          </ul>
        </section>
      </div>
      <p v-else class="mm-provider-status">
        Nenhuma plataforma informada para este filme no Brasil.
      </p>
      <footer class="mm-provider-footer">
        <a v-if="providers?.link" :href="providers.link" target="_blank" rel="noopener noreferrer"
          >Consultar disponibilidade no TMDB <BaseIcon name="arrow"
        /></a>
        <p>
          Dados de disponibilidade:
          <a href="https://www.justwatch.com/br" target="_blank" rel="noopener noreferrer"
            >JustWatch</a
          >, via TMDB.
        </p>
      </footer>
    </template>
  </section>
</template>
<script setup lang="ts">
import BaseIcon from './BaseIcon.vue';
import { useRuntimeConfig } from '#imports';
const imageBase = String(useRuntimeConfig().public.tmdbImageBase).replace(/\/$/, '');
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue';
import KitService from 'src/core/services/KitService';
import type { MovieWatchProvider } from 'src/core/types/movie/MovieType';
const props = defineProps<{ tmdbId?: number }>();
const result = ref<MovieWatchProvider>(),
  loading = ref(false),
  error = ref(false);
const failedLogos = ref(new Set<string>());
const providers = computed(() => result.value?.results?.BR);
const groups = [
  {
    key: 'flatrate',
    title: 'Streaming por assinatura',
    description: 'Disponível no catálogo de uma assinatura.',
  },
  {
    key: 'rent',
    title: 'Alugar',
    description: 'Pagamento por filme, com acesso por tempo limitado.',
  },
  {
    key: 'buy',
    title: 'Comprar',
    description: 'Compra digital, conforme as condições da plataforma.',
  },
  { key: 'free', title: 'Grátis', description: 'Disponível sem cobrança, conforme a plataforma.' },
  {
    key: 'ads',
    title: 'Grátis com anúncios',
    description: 'Disponível com intervalos publicitários.',
  },
] as const;
const availableGroups = computed(() =>
  groups.filter((group) => providers.value?.[group.key]?.length),
);
const hasProviders = computed(() => availableGroups.value.length > 0);
let request = 0;
async function load() {
  const id = ++request;
  result.value = undefined;
  failedLogos.value = new Set();
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
onBeforeUnmount(() => request++);
watch(() => props.tmdbId, load);
</script>
<style scoped>
.mm-providers {
  margin-top: 1.5rem;
  min-width: 0;
}
.mm-providers-heading {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-bottom: 1rem;
}
.mm-providers-heading h3 {
  margin: 0;
}
.mm-provider-country {
  padding: 0.2rem 0.6rem;
  border: 1px solid var(--mm-border);
  border-radius: 99px;
  font-size: 0.75rem;
  color: var(--mm-muted);
}
.mm-provider-loading {
  min-height: 190px;
}
.mm-provider-skeleton {
  border: 1px solid var(--mm-border);
  border-radius: 12px;
  padding: 1rem;
  opacity: 0.65;
}
.mm-provider-skeleton > i {
  display: block;
  height: 0.8rem;
  width: 40%;
  border-radius: 4px;
  background: var(--mm-raised);
}
.mm-provider-skeleton > div {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}
.mm-provider-skeleton span {
  display: block;
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: var(--mm-raised);
}
.mm-provider-groups {
  display: grid;
  gap: 0.85rem;
}
.mm-provider-category {
  min-width: 0;
  padding: 1rem;
  border: 1px solid var(--mm-border);
  border-radius: 12px;
  background: var(--mm-surface);
}
.mm-provider-category h4 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
}
.mm-provider-description {
  margin: 0.3rem 0 0.9rem;
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--mm-muted);
}
.mm-provider-list {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 0;
  margin: 0;
  list-style: none;
}
.mm-provider-list li {
  flex: 0 1 96px;
  min-width: 0;
  max-width: 100%;
}
.mm-provider-list figure {
  display: grid;
  justify-items: center;
  gap: 0.4rem;
  margin: 0;
  text-align: center;
}
.mm-provider-list img,
.mm-provider-no-logo {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  object-fit: contain;
}
.mm-provider-no-logo {
  display: grid;
  place-items: center;
  background: var(--mm-raised);
}
.mm-provider-list figcaption {
  font-size: 0.75rem;
  line-height: 1.4;
  word-break: normal;
  overflow-wrap: break-word;
}
.mm-provider-status {
  padding: 0.9rem 0;
  font-size: 0.85rem;
  color: var(--mm-muted);
}
.mm-provider-footer {
  display: grid;
  gap: 0.5rem;
  margin-top: 1rem;
}
.mm-provider-footer > a {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.3rem;
  min-height: 44px;
  width: fit-content;
}
.mm-provider-footer p {
  margin: 0;
  font-size: 0.75rem;
  color: var(--mm-muted);
}
.mm-provider-footer p a {
  text-decoration: underline;
}
</style>
