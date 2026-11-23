<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useUserStore } from '~/core/stores/UserStore';
import type { RankingRound } from '../services/RankingCatalogService';
import service, {
  type RoundAggregate,
  type RoundDisclosure,
  type RoundScope,
} from '../services/RankingRoundService';
import { formatRatingMean } from '../utils/formatRatingMean';
import RankingOwnRating from './RankingOwnRating.vue';

const props = defineProps<{
  rankingId: string;
  entryId: string;
  entryTitle: string;
  round: RankingRound;
  canRate: boolean;
  reconcile: boolean;
}>();
const emit = defineEmits<{
  transitioned: [scope: RoundScope];
  scopeLost: [status: number];
  ownScopeLost: [status: number];
  interaction: [state: 'idle' | 'draft' | 'pending'];
  reconciliation: [required: boolean];
  confirmed: [];
}>();
const user = useUserStore();
const { t, locale } = useI18n();
const roundId = useId(),
  regionId = useId();
const opened = ref(false),
  opening = ref(false),
  aggregating = ref(false);
const feedback = ref(''),
  aggregateError = ref(false);
const projection = ref<RoundDisclosure | null>(null),
  aggregate = ref<RoundAggregate | null>(null);
const toggle = ref<HTMLButtonElement>();
const interaction = ref<'idle' | 'draft' | 'pending'>('idle');
const closeHint = ref(false);
function markInteraction(state: 'idle' | 'draft' | 'pending') {
  if (!opened.value && state !== 'idle') return;
  interaction.value = state;
  closeHint.value = false;
  emit('interaction', state);
}
let known = props.round.revealed;
let epoch = 0,
  aggregateEpoch = 0;
let detailRequest: AbortController | undefined, aggregateRequest: AbortController | undefined;
const label = computed(() => t('rankingDetail.round', { number: props.round.number }));
function scope(): RoundScope {
  return { rankingId: props.rankingId, entryId: props.entryId, roundId: props.round.round_id };
}
function clear() {
  epoch++;
  aggregateEpoch++;
  detailRequest?.abort();
  aggregateRequest?.abort();
  opened.value = false;
  markInteraction('idle');
  opening.value = false;
  aggregating.value = false;
  projection.value = null;
  aggregate.value = null;
  feedback.value = '';
  aggregateError.value = false;
}
watch(
  [
    () => props.rankingId,
    () => props.entryId,
    () => props.round.round_id,
    () => user.user.generation,
    () => user.user.isLoged,
  ],
  () => {
    clear();
    known = props.round.revealed;
  },
  { flush: 'sync' },
);
watch(
  () => props.round.revealed,
  (value) => {
    if (!opened.value && known !== true) known = value;
  },
);
onBeforeUnmount(clear);
function statusOf(e: unknown) {
  return (e as { response?: { status?: number } })?.response?.status;
}
function denied(status: number | undefined): status is number {
  return status === 401 || status === 403 || status === 404;
}
async function close() {
  if (interaction.value !== 'idle') {
    closeHint.value = true;
    return;
  }
  clear();
  await nextTick();
  toggle.value?.focus();
}
async function refreshAggregate() {
  if (!opened.value || projection.value?.revealed !== true || !user.user.isLoged) return;
  const started = epoch,
    request = ++aggregateEpoch,
    current = scope();
  aggregateRequest?.abort();
  aggregateRequest = new AbortController();
  aggregate.value = null;
  aggregateError.value = false;
  aggregating.value = true;
  try {
    const value = await service.aggregate(current, aggregateRequest.signal);
    if (started !== epoch || request !== aggregateEpoch) return;
    if (value.round_id !== current.roundId || value.revealed !== true) {
      aggregateError.value = true;
      return;
    }
    aggregate.value = value;
  } catch (e) {
    if (started !== epoch || request !== aggregateEpoch) return;
    const status = statusOf(e);
    if (denied(status)) {
      clear();
      feedback.value = 'unavailable';
      emit('scopeLost', status);
    } else aggregateError.value = true;
  } finally {
    if (started === epoch && request === aggregateEpoch) aggregating.value = false;
  }
}
async function open() {
  if (opened.value || opening.value || !user.user.isLoged) return;
  const started = ++epoch,
    current = scope(),
    expectedNumber = props.round.number;
  detailRequest = new AbortController();
  opening.value = true;
  feedback.value = '';
  try {
    const result = await service.enter(current, detailRequest.signal);
    if (started !== epoch) return;
    if (result.round_id !== current.roundId || result.round_number !== expectedNumber) {
      feedback.value = 'unavailable';
      return;
    }
    const transitioned = known === false && result.revealed === true;
    known = result.revealed;
    projection.value = result;
    opened.value = true;
    if (transitioned) emit('transitioned', current);
    if (result.revealed === true) void refreshAggregate();
  } catch (e) {
    if (started !== epoch) return;
    projection.value = null;
    aggregate.value = null;
    const status = statusOf(e);
    feedback.value = denied(status) ? 'unavailable' : 'openError';
    if (denied(status)) emit('scopeLost', status);
  } finally {
    if (started === epoch) opening.value = false;
  }
}
function ownScopeLost(status: number) {
  clear();
  feedback.value = 'unavailable';
  emit('ownScopeLost', status);
}
function confirmed() {
  emit('confirmed');
  void refreshAggregate();
}
</script>
<template>
  <article class="mm-ranking-round" :aria-labelledby="roundId">
    <h3 :id="roundId">{{ label }}</h3>
    <button
      ref="toggle"
      type="button"
      class="mm-button"
      :aria-expanded="opened"
      :aria-controls="regionId"
      :aria-describedby="roundId"
      :disabled="opening"
      @click="opened ? close() : open()"
    >
      {{ t(opened ? 'rankingRoundPanel.close' : 'rankingRoundPanel.open') }}
    </button>
    <p v-if="closeHint" role="status">
      {{
        t(interaction === 'pending' ? 'rankingRoundPanel.busy' : 'rankingRoundPanel.finishDraft')
      }}
    </p>
    <p v-if="opening" role="status">{{ t('rankingDetail.loading') }}</p>
    <p v-if="feedback" role="alert">{{ t(`rankingRoundPanel.${feedback}`) }}</p>
    <div :id="regionId" class="mm-round-content" :hidden="!opened">
      <template v-if="opened && projection">
        <p v-if="round.description" class="mm-round-description">{{ round.description }}</p>
        <p>
          {{
            t(
              projection.revealed === true
                ? 'rankingDetail.revealed'
                : projection.revealed === false
                  ? 'rankingDetail.hidden'
                  : 'rankingDetail.unknownReveal',
            )
          }}
        </p>
        <p v-if="aggregating" role="status">{{ t('rankingDetail.loading') }}</p>
        <div v-if="aggregateError" role="alert">
          <p>{{ t('rankingRoundPanel.aggregateError') }}</p>
          <button type="button" class="mm-button" @click="refreshAggregate">
            {{ t('rankingDetail.retry') }}
          </button>
        </div>
        <template v-if="aggregate?.revealed === true">
          <p v-if="aggregate.votes === 0n">{{ t('rankingRoundPanel.noVotes') }}</p>
          <p v-else>
            {{ t('rankingRoundPanel.mean') }}:
            <strong>{{ formatRatingMean(aggregate.total, aggregate.votes, locale) }}</strong>
            <span class="mm-sr-only"
              >{{ t('rankingDetail.exactRatio') }} {{ aggregate.total.toString() }} /
              {{ aggregate.votes.toString() }}</span
            >
          </p>
        </template>
        <RankingOwnRating
          :ranking-id="rankingId"
          :round-id="round.round_id"
          :target-label="`${entryTitle} · ${label}`"
          :can-rate="canRate"
          :reconcile="reconcile"
          @scope-lost="ownScopeLost"
          @interaction="markInteraction"
          @reconciliation="emit('reconciliation', $event)"
          @confirmed="confirmed"
        />
      </template>
    </div>
  </article>
</template>
<style scoped>
.mm-ranking-round {
  min-width: 0;
  overflow-wrap: anywhere;
}
.mm-ranking-round h3 {
  margin: 0 0 8px;
}
.mm-round-content {
  margin-top: 12px;
  min-width: 0;
}
.mm-round-content[hidden] {
  display: none;
}
.mm-round-description {
  white-space: pre-wrap;
}
</style>
