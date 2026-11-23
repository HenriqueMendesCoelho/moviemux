<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useUserStore } from '~/core/stores/UserStore';
import BaseContainerMain from '~/core/components/BaseContainerMain.vue';
import joinOpenRanking, { canonicalJoinId } from '../services/RankingJoinService';
import catalog from '../services/RankingCatalogService';
import type { RankingSummary } from '../services/RankingService';

const props = defineProps<{ rankingId: unknown }>();
const { t } = useI18n();
const user = useUserStore();
const rankingId = computed(() => canonicalJoinId(props.rankingId));
const phase = ref<
  'ready' | 'joining' | 'checking' | 'reconcile' | 'retry' | 'unavailable' | 'joined'
>('ready');
const authorized = ref<RankingSummary | null>(null);
const feedback = ref('');
let epoch = 0;
let request: AbortController | undefined;
let membershipConfirmed = false;
function reset() {
  epoch++;
  request?.abort();
  phase.value = 'ready';
  authorized.value = null;
  feedback.value = '';
  membershipConfirmed = false;
}
watch([rankingId, () => user.user.generation, () => user.user.isLoged], reset, { flush: 'sync' });
onBeforeUnmount(reset);

function problem(e: unknown) {
  const response = (e as { response?: { status?: number; data?: { data?: { code?: string } } } })
    ?.response;
  return { status: response?.status, code: response?.data?.data?.code };
}
function unavailable(status?: number, label?: string) {
  phase.value = 'unavailable';
  authorized.value = null;
  feedback.value = label || (status === 401 ? 'sessionExpired' : 'unavailable');
}
async function verify(id: string, started: number, readMembership: boolean) {
  if (started !== epoch) return;
  phase.value = 'checking';
  feedback.value = '';
  request?.abort();
  const current = new AbortController();
  request = current;
  try {
    if (readMembership && !membershipConfirmed) {
      let access;
      try {
        access = await catalog.access(id, current.signal);
      } catch (error) {
        if (started !== epoch) return;
        const { status, code } = problem(error);
        if (status === 404 && code === 'ranking.not_found') {
          // Scope denial does not establish absence or whether the previous request committed.
          phase.value = 'retry';
          feedback.value = 'cannotConfirm';
          return;
        }
        throw error;
      }
      if (started !== epoch) return;
      if (access.ranking_id !== id || !access.capabilities.includes('READ')) {
        phase.value = 'reconcile';
        feedback.value = 'cannotConfirm';
        return;
      }
      membershipConfirmed = true;
    }
    const summary = await catalog.summary(id, current.signal);
    if (started !== epoch) return;
    if (summary.ranking_id !== id || !summary.capabilities.includes('READ')) {
      phase.value = 'reconcile';
      feedback.value = 'accessUnavailable';
      return;
    }
    authorized.value = summary;
    phase.value = 'joined';
  } catch (error) {
    if (started !== epoch) return;
    const { status } = problem(error);
    if (status === 401 || status === 403) {
      unavailable(status);
      return;
    }
    phase.value = 'reconcile';
    feedback.value = membershipConfirmed ? 'accessUnavailable' : 'checkError';
  }
}
async function join() {
  const id = rankingId.value;
  if (
    !id ||
    !user.user.isLoged ||
    membershipConfirmed ||
    !(phase.value === 'ready' || phase.value === 'retry')
  )
    return;
  const started = epoch;
  feedback.value = '';
  phase.value = 'joining';
  try {
    await joinOpenRanking(id);
  } catch (error) {
    if (started !== epoch) return;
    const { status, code } = problem(error);
    if (status === 401 || status === 403 || status === 404) {
      unavailable(status);
      return;
    }
    if (status === 400 && code === 'ranking.invalid_join') {
      unavailable(status, 'invalid');
      return;
    }
    phase.value = 'reconcile';
    feedback.value = 'uncertain';
    return;
  }
  if (started !== epoch) return;
  membershipConfirmed = true;
  await verify(id, started, false);
}
async function recheck() {
  const id = rankingId.value;
  if (!id || !user.user.isLoged || phase.value !== 'reconcile') return;
  await verify(id, epoch, true);
}
</script>
<template>
  <BaseContainerMain>
    <section
      class="mm-join-ranking"
      aria-labelledby="ranking-join-title"
      :aria-busy="phase === 'joining' || phase === 'checking'"
    >
      <NuxtLink to="/movies/collections" class="mm-join-back" no-prefetch>{{
        t('rankingJoin.back')
      }}</NuxtLink>
      <h1 id="ranking-join-title">{{ t('rankingJoin.title') }}</h1>
      <p v-if="!rankingId" role="alert">{{ t('rankingJoin.unavailable') }}</p>
      <template v-else-if="user.user.isLoged">
        <template v-if="authorized">
          <p role="status">
            {{ t('rankingJoin.confirmed', { name: authorized.name || t('rankings.unnamed') }) }}
          </p>
          <NuxtLink
            :to="`/movies/collections/${authorized.ranking_id}`"
            class="mm-button mm-button-primary"
            no-prefetch
            >{{ t('rankingJoin.open') }}</NuxtLink
          >
        </template>
        <template v-else>
          <p v-if="phase === 'ready'">{{ t('rankingJoin.intro') }}</p>
          <p v-if="phase === 'joining' || phase === 'checking'" role="status">
            {{ t('rankingJoin.working') }}
          </p>
          <p v-if="feedback" role="alert">{{ t(`rankingJoin.${feedback}`) }}</p>
          <button
            v-if="phase === 'ready' || phase === 'retry'"
            type="button"
            class="mm-button mm-button-primary"
            @click="join"
          >
            {{ t(phase === 'retry' ? 'rankingJoin.retry' : 'rankingJoin.join') }}
          </button>
          <button
            v-else-if="phase === 'reconcile'"
            type="button"
            class="mm-button"
            @click="recheck"
          >
            {{ t('rankingJoin.check') }}
          </button>
        </template>
      </template>
      <p v-else role="status">{{ t('rankingJoin.sessionExpired') }}</p>
    </section>
  </BaseContainerMain>
</template>
<style scoped>
.mm-join-ranking {
  max-width: 680px;
  min-width: 0;
  padding: clamp(18px, 4vw, 28px);
  border: 1px solid var(--mm-border);
  border-radius: 16px;
  background: var(--mm-surface);
  overflow-wrap: anywhere;
}
.mm-join-ranking h1 {
  margin: 0.5rem 0;
}
.mm-join-ranking p {
  line-height: 1.6;
}
.mm-join-back {
  display: inline-block;
  padding: 8px 0;
}
</style>
