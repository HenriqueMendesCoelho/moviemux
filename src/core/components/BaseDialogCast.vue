<template>
  <BaseModal v-model="visible" title="Elenco e equipe" wide @hide="emit('hide')"
    ><p v-if="loading" role="status">Carregando elenco…</p>
    <p v-else-if="error" class="mm-error" role="alert">
      {{ error }} <button type="button" class="mm-button" @click="load">Tentar novamente</button>
    </p>
    <template v-else
      ><h3>Elenco</h3>
      <div class="mm-people-grid">
        <figure v-for="(member, index) in credits?.cast" :key="index">
          <img
            v-if="member.profile_path"
            :src="image(member.profile_path)"
            :alt="member.name"
            loading="lazy"
          />
          <div v-else class="mm-person-placeholder" aria-hidden="true">◉</div>
          <figcaption>
            <strong>{{ member.name }}</strong
            ><small>{{ member.character }}</small>
          </figcaption>
        </figure>
      </div>
      <p v-if="!credits?.cast.length" class="mm-empty">Elenco não informado.</p>
      <details class="mm-crew">
        <summary>Equipe técnica ({{ credits?.crew.length || 0 }})</summary>
        <div class="mm-people-grid">
          <figure v-for="(member, index) in credits?.crew" :key="index">
            <img
              v-if="member.profile_path"
              :src="image(member.profile_path)"
              :alt="member.name"
              loading="lazy"
            />
            <div v-else class="mm-person-placeholder" aria-hidden="true">◉</div>
            <figcaption>
              <strong>{{ member.name }}</strong
              ><small>{{ member.department }} · {{ member.job }}</small>
            </figcaption>
          </figure>
        </div>
      </details></template
    ></BaseModal
  >
</template>
<script setup lang="ts">
import { useRuntimeConfig } from '#imports';
const imageBase = String(useRuntimeConfig().public.tmdbImageBase).replace(/\/$/, '');
import { computed, ref, watch } from 'vue';
import BaseModal from './BaseModal.vue';
import KitService from 'src/core/services/KitService';
import type { Credits } from 'src/core/types/movie/MovieType';
const props = defineProps<{ modelValue: boolean; movieId: number }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; hide: [] }>();
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});
const credits = ref<Credits>(),
  loading = ref(false),
  error = ref('');
let request = 0;
async function load() {
  if (!props.movieId) return;
  const id = ++request;
  loading.value = true;
  error.value = '';
  try {
    const result = await KitService.getMovieCredits(props.movieId);
    if (id === request) credits.value = result;
  } catch {
    if (id === request) error.value = 'Não foi possível carregar o elenco.';
  } finally {
    if (id === request) loading.value = false;
  }
}
watch(
  () => [props.modelValue, props.movieId],
  () => {
    if (props.modelValue) void load();
  },
  { immediate: true },
);
function image(path: string) {
  return `${imageBase}/w185${path}`;
}
</script>
<style scoped>
.mm-people-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(125px, 1fr));
  gap: 20px;
  margin: 18px 0;
}
.mm-people-grid figure {
  margin: 0;
}
.mm-people-grid img,
.mm-person-placeholder {
  width: 100%;
  aspect-ratio: 2/3;
  object-fit: cover;
  border-radius: 12px;
  background: var(--grey-mid);
}
.mm-person-placeholder {
  display: grid;
  place-items: center;
  font-size: 2rem;
}
.mm-people-grid strong,
.mm-people-grid small {
  display: block;
  margin-top: 6px;
}
.mm-people-grid small {
  opacity: 0.65;
}
.mm-crew {
  margin-top: 24px;
}
.mm-crew summary {
  cursor: pointer;
  font-weight: 700;
}
</style>
