<template>
  <BaseModal v-model="visible" title="Elenco e equipe" wide class="mm-cast-dialog" @hide="onHide">
    <section class="mm-cast-content" :aria-busy="loading">
      <p v-if="loading" class="mm-cast-status" role="status">Carregando elenco e equipe…</p>
      <Transition name="mm-cast-state" mode="out-in">
        <div
          v-if="loading"
          key="loading"
          class="mm-people-grid mm-people-skeleton"
          aria-hidden="true"
        >
          <div v-for="n in 10" :key="n">
            <div class="mm-person-loading" />
            <i /><i />
          </div>
        </div>
        <div v-else-if="error" key="error" class="mm-cast-error" role="alert">
          <BaseIcon name="refresh" />
          <h3>O elenco não carregou</h3>
          <p>{{ error }}</p>
          <button type="button" class="mm-button mm-button-primary" @click="load">
            Tentar novamente</button
          ><button type="button" class="mm-link" @click="visible = false">Fechar</button>
        </div>
        <div v-else key="content">
          <h3 class="mm-cast-heading">
            Elenco <span>{{ credits?.cast.length || 0 }}</span>
          </h3>
          <div v-if="credits?.cast.length" class="mm-people-grid">
            <figure v-for="(member, index) in credits.cast" :key="`${member.name}:${index}`">
              <BasePersonPortrait :src="image(member.profile_path)" :name="member.name" />
              <figcaption>
                <strong>{{ member.name }}</strong
                ><small>{{ member.character || 'Personagem não informado' }}</small>
              </figcaption>
            </figure>
          </div>
          <div v-else class="mm-cast-empty">
            <h4>Nenhum nome disponível por enquanto</h4>
            <p>O catálogo ainda não informou o elenco deste filme.</p>
          </div>
          <details class="mm-crew">
            <summary>
              Equipe técnica <span>{{ credits?.crew.length || 0 }}</span>
            </summary>
            <div v-if="credits?.crew.length" class="mm-people-grid">
              <figure
                v-for="(member, index) in credits.crew"
                :key="`${member.name}:${member.job}:${index}`"
              >
                <BasePersonPortrait :src="image(member.profile_path)" :name="member.name" />
                <figcaption>
                  <strong>{{ member.name }}</strong
                  ><small>{{
                    [member.department, member.job].filter(Boolean).join(' · ') ||
                    'Função não informada'
                  }}</small>
                </figcaption>
              </figure>
            </div>
            <p v-else class="mm-cast-empty">Equipe técnica não informada.</p>
          </details>
        </div>
      </Transition>
    </section>
  </BaseModal>
</template>
<script setup lang="ts">
import { useRuntimeConfig } from '#imports';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import BaseModal from './BaseModal.vue';
import BaseIcon from './BaseIcon.vue';
import BasePersonPortrait from './BasePersonPortrait.vue';
import KitService from 'src/core/services/KitService';
import { tmdbImageUrl } from 'src/modules/movie/utils/MovieStateUtils';
import type { Credits } from 'src/core/types/movie/MovieType';
const imageBase = String(useRuntimeConfig().public.tmdbImageBase).replace(/\/$/, '');
const props = defineProps<{ modelValue: boolean; movieId: number }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; hide: [] }>();
const credits = ref<Credits>();
const loading = ref(false);
const error = ref('');
let request = 0;
let active = true;
let activeTarget: number | undefined;
function invalidate() {
  request++;
  loading.value = false;
  credits.value = undefined;
  error.value = '';
  activeTarget = undefined;
}
const visible = computed({
  get: () => props.modelValue,
  set: (value) => {
    if (!value) invalidate();
    emit('update:modelValue', value);
  },
});
function onHide() {
  invalidate();
  emit('hide');
}
async function load() {
  if (
    !active ||
    !props.modelValue ||
    !props.movieId ||
    (loading.value && activeTarget === props.movieId)
  )
    return;
  const target = props.movieId;
  const id = ++request;
  activeTarget = target;
  loading.value = true;
  error.value = '';
  const current = () => active && props.modelValue && props.movieId === target && id === request;
  try {
    const result = await KitService.getMovieCredits(target);
    if (!result || !Array.isArray(result.cast) || !Array.isArray(result.crew))
      throw new Error('Invalid credits response');
    if (current()) credits.value = result;
  } catch {
    if (current())
      error.value =
        'Não foi possível consultar estas informações. Você pode tentar novamente sem sair da janela.';
  } finally {
    if (current()) loading.value = false;
  }
}
watch(
  () => [props.modelValue, props.movieId],
  () => {
    invalidate();
    if (props.modelValue) void load();
  },
  { immediate: true, flush: 'sync' },
);
onBeforeUnmount(() => {
  active = false;
  invalidate();
});
function image(path?: string | null) {
  return path ? tmdbImageUrl(imageBase, path, 'w185') : undefined;
}
</script>
<style scoped>
.mm-cast-dialog {
  height: min(780px, 88dvh);
  overflow: hidden;
}
.mm-cast-dialog :deep(.mm-modal-content) {
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.mm-cast-dialog :deep(.mm-modal-header) {
  flex-shrink: 0;
  flex-wrap: nowrap;
  margin-bottom: 1rem;
}
.mm-cast-dialog :deep(.mm-modal-header h2) {
  flex: 1 1 auto;
  min-width: 0;
}
.mm-cast-content {
  min-height: 0;
  flex: 1;
  overflow: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  padding-right: 0.25rem;
}
.mm-cast-heading {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin: 0.25rem 0 1rem;
  font-size: 1rem;
}
.mm-cast-heading span,
.mm-crew summary span {
  font-size: 0.75rem;
  color: var(--mm-muted);
  font-weight: 500;
}
.mm-people-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 1.5rem 1rem;
  margin: 1rem 0;
}
.mm-people-grid figure {
  margin: 0;
  min-width: 0;
}
.mm-people-grid strong,
.mm-people-grid small {
  display: block;
  overflow-wrap: anywhere;
  margin-top: 0.4rem;
  line-height: 1.4;
}
.mm-people-grid strong {
  font-size: 0.85rem;
  font-weight: 600;
}
.mm-people-grid small {
  color: var(--mm-muted);
  font-size: 0.75rem;
}
.mm-crew {
  margin-top: 1.5rem;
  border-top: 1px solid var(--mm-border);
  padding-top: 1rem;
}
.mm-crew summary {
  cursor: pointer;
  font-weight: 600;
  min-height: 44px;
  padding: 0.5rem 0;
}
.mm-cast-empty {
  color: var(--mm-muted);
  padding: 1.5rem 0;
  line-height: 1.6;
}
.mm-cast-empty h4 {
  color: var(--mm-text);
  margin: 0 0 0.5rem;
}
.mm-cast-empty p {
  margin: 0;
}
.mm-cast-error {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 1rem;
  min-height: 440px;
  text-align: center;
  padding: 2rem;
}
.mm-cast-error h3,
.mm-cast-error p {
  margin: 0;
}
.mm-cast-error p {
  max-width: 40ch;
  line-height: 1.6;
  color: var(--mm-muted);
}
.mm-person-loading {
  aspect-ratio: 2/3;
  border-radius: 12px;
  background: var(--mm-raised);
}
.mm-people-skeleton i {
  display: block;
  height: 12px;
  width: 85%;
  margin-top: 0.6rem;
  background: var(--mm-raised);
  border-radius: 5px;
}
.mm-people-skeleton i:last-child {
  width: 60%;
}
.mm-people-skeleton {
  animation: cast-pulse 1.5s ease-in-out infinite alternate;
}
.mm-cast-status {
  color: var(--mm-muted);
  font-size: 0.85rem;
  margin: 0.25rem 0 1rem;
}
.mm-cast-state-enter-active,
.mm-cast-state-leave-active {
  transition: opacity 0.16s ease;
}
.mm-cast-state-enter-from,
.mm-cast-state-leave-to {
  opacity: 0;
}
@keyframes cast-pulse {
  from {
    opacity: 0.5;
  }
  to {
    opacity: 1;
  }
}
@media (max-width: 600px) {
  .mm-cast-dialog {
    height: 90dvh;
  }
  .mm-cast-dialog :deep(.mm-modal-content) {
    padding: 1rem;
  }
  .mm-people-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.2rem 0.8rem;
  }
  .mm-cast-error {
    min-height: 360px;
    padding: 1rem;
  }
}
@media (prefers-reduced-motion: reduce) {
  .mm-people-skeleton {
    animation: none;
  }
  .mm-cast-state-enter-active,
  .mm-cast-state-leave-active {
    transition: none;
  }
}
</style>
