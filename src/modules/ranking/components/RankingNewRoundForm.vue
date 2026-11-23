<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useUserStore } from '~/core/stores/UserStore';
import { canonicalRoundDescription } from '../utils/roundDescription';
import rounds, {
  type CreatedRound,
  type RoundCreationIntent,
} from '../services/RankingRepeatedRoundService';
import catalog from '../services/RankingCatalogService';

const props = defineProps<{
  rankingId: string;
  entryId: string;
  ownerAuthorized: boolean;
  repeatEnabled: boolean;
  blockWrite?: boolean;
}>();
// Parent owns in-memory intent by rank + entry + session generation across remount.
const intent = defineModel<RoundCreationIntent | null>('intent', { default: null });
const emit = defineEmits<{
  created: [result: CreatedRound & { rankingId: string; entryId: string }];
  settings: [value: boolean | null];
  scopeLost: [status: number];
  policyStale: [];
  interaction: [state: 'idle' | 'draft' | 'pending' | 'uncertain'];
}>();
const user = useUserStore(),
  { t, locale } = useI18n();
const descriptionId = useId(),
  hintId = useId(),
  errorId = useId();
const open = ref(false),
  description = ref(''),
  writing = ref(false),
  checking = ref(false),
  ready = ref(false);
const feedback = ref(''),
  receipt = ref<CreatedRound | null>(null);
const input = ref<HTMLTextAreaElement>(),
  opener = ref<HTMLButtonElement>();
const currentIntent = computed(() => {
  const value = intent.value;
  return user.user.isLoged &&
    value &&
    value.generation === user.user.generation &&
    value.rankingId === props.rankingId &&
    value.entryId === props.entryId
    ? value
    : null;
});
const interaction = computed(() =>
  writing.value ? 'pending' : currentIntent.value ? 'uncertain' : open.value ? 'draft' : 'idle',
);
watch(interaction, (state) => emit('interaction', state), { immediate: true, flush: 'sync' });
let epoch = 0,
  request: AbortController | undefined;
function reset() {
  epoch++;
  request?.abort();
  open.value = false;
  description.value = '';
  writing.value = false;
  checking.value = false;
  ready.value = false;
  feedback.value = '';
  receipt.value = null;
}
watch(
  [() => props.rankingId, () => props.entryId, () => user.user.generation, () => user.user.isLoged],
  reset,
  { flush: 'sync' },
);
watch(
  () => props.ownerAuthorized,
  (authorized) => {
    if (!authorized) reset();
  },
  { flush: 'sync' },
);
onBeforeUnmount(reset);
function allowed() {
  return props.ownerAuthorized && user.user.isLoged;
}
async function show() {
  if (
    props.blockWrite ||
    !allowed() ||
    !props.repeatEnabled ||
    writing.value ||
    currentIntent.value
  )
    return;
  open.value = true;
  feedback.value = '';
  receipt.value = null;
  await nextTick();
  if (open.value) input.value?.focus();
}
async function dismiss() {
  if (writing.value || currentIntent.value) return;
  open.value = false;
  description.value = '';
  feedback.value = '';
  await nextTick();
  opener.value?.focus();
}
function error(e: unknown) {
  const r = (e as { response?: { status?: number; data?: { data?: { code?: string } } } })
    ?.response;
  return { status: r?.status, code: r?.data?.data?.code };
}
async function write(scope: RoundCreationIntent) {
  const started = epoch;
  writing.value = true;
  ready.value = false;
  feedback.value = '';
  try {
    const result = await rounds.create(scope);
    if (started !== epoch) return;
    intent.value = null;
    open.value = false;
    description.value = '';
    receipt.value = result;
    emit('created', { ...result, rankingId: scope.rankingId, entryId: scope.entryId });
  } catch (e) {
    if (started !== epoch) return;
    const { status, code } = error(e);
    if (status === 401 || status === 403 || status === 404) {
      intent.value = null;
      open.value = false;
      description.value = '';
      emit('scopeLost', status);
    } else if (
      status === 409 &&
      (code === 'ranking.round_command_conflict' || code === 'ranking.repeat_rounds_disabled')
    ) {
      intent.value = null;
      description.value = '';
      open.value = false;
      feedback.value = code.endsWith('disabled') ? 'disabled' : 'conflict';
      if (code === 'ranking.repeat_rounds_disabled') emit('policyStale');
    } else if (status === 400 && code === 'ranking.invalid_round_command') {
      intent.value = null;
      feedback.value = 'invalid';
    } else {
      open.value = false;
      description.value = '';
      feedback.value = 'roundUncertain';
    }
  } finally {
    if (started === epoch) writing.value = false;
  }
}
async function submit() {
  if (
    props.blockWrite ||
    !allowed() ||
    !props.repeatEnabled ||
    !open.value ||
    writing.value ||
    checking.value ||
    currentIntent.value
  )
    return;
  const reason = canonicalRoundDescription(description.value);
  if (reason === undefined) {
    feedback.value = 'invalid';
    input.value?.focus();
    return;
  }
  if (typeof globalThis.crypto?.randomUUID !== 'function') {
    feedback.value = 'unavailable';
    return;
  }
  const active: RoundCreationIntent = {
    rankingId: props.rankingId,
    entryId: props.entryId,
    generation: user.user.generation,
    commandId: globalThis.crypto.randomUUID(),
    description: reason,
  };
  intent.value = active;
  await write(active);
}
async function reconcile() {
  const target = currentIntent.value;
  if (props.blockWrite || !allowed() || !target || checking.value || writing.value) return;
  const started = epoch;
  request?.abort();
  request = new AbortController();
  const current = request;
  checking.value = true;
  ready.value = false;
  feedback.value = '';
  try {
    const setting = await rounds.settings(target.rankingId, current.signal);
    if (started !== epoch || current.signal.aborted) return;
    const page = await catalog.rounds(target.rankingId, target.entryId, undefined, current.signal);
    if (started !== epoch || current.signal.aborted) return;
    if (!page || !Array.isArray(page.items)) throw new Error('Unverified rounds');
    emit('settings', setting);
    // No receipt/command ID appears in the read list. Neither first-page presence
    // nor absence identifies a specific command. Only the same explicit replay can.
    ready.value = true;
    feedback.value = 'roundChecked';
  } catch (e) {
    if (started !== epoch || current.signal.aborted) return;
    const { status } = error(e);
    if (status === 401 || status === 403 || status === 404) {
      intent.value = null;
      emit('scopeLost', status);
    } else feedback.value = 'checkError';
  } finally {
    if (started === epoch && !current.signal.aborted) checking.value = false;
  }
}
async function retry() {
  const target = currentIntent.value;
  if (props.blockWrite || !allowed() || !ready.value || !target || writing.value || checking.value)
    return;
  await write(target);
}
const ordinal = computed(() =>
  receipt.value
    ? new Intl.NumberFormat(locale.value, { useGrouping: false }).format(receipt.value.ordinal)
    : '',
);
</script>
<template>
  <section
    v-if="ownerAuthorized && (repeatEnabled || currentIntent || feedback || receipt)"
    class="mm-new-round"
    :aria-busy="writing || checking"
  >
    <p v-if="receipt" role="status">
      {{
        t(receipt.replayed ? 'rankingRepeatedRounds.replayed' : 'rankingRepeatedRounds.created', {
          round: ordinal,
        })
      }}
    </p>
    <template v-if="currentIntent">
      <p v-if="!writing && !feedback" role="alert">
        {{ t('rankingRepeatedRounds.roundUncertain') }}
      </p>
      <button
        v-if="!writing"
        class="mm-button"
        type="button"
        :disabled="blockWrite || checking"
        @click="reconcile"
      >
        {{ t('rankingRepeatedRounds.checkRounds') }}
      </button>
      <button
        v-if="ready"
        class="mm-button mm-button-primary"
        type="button"
        :disabled="blockWrite || writing || checking"
        @click="retry"
      >
        {{ t('rankingRepeatedRounds.retrySame') }}
      </button>
    </template>
    <form
      v-else-if="open"
      class="mm-new-round-form"
      @submit.prevent="submit"
      @keydown.esc.prevent.stop="dismiss"
    >
      <label :for="descriptionId">{{ t('rankingRepeatedRounds.description') }}</label>
      <p :id="hintId">{{ t('rankingRepeatedRounds.descriptionHint') }}</p>
      <textarea
        :id="descriptionId"
        ref="input"
        v-model="description"
        rows="3"
        :disabled="writing"
        :aria-describedby="feedback === 'invalid' ? `${hintId} ${errorId}` : hintId"
        :aria-invalid="feedback === 'invalid'"
      />
      <div class="mm-new-round-actions">
        <button
          type="submit"
          class="mm-button mm-button-primary"
          :disabled="blockWrite || !repeatEnabled || writing"
        >
          {{ t('rankingRepeatedRounds.create') }}
        </button>
        <button type="button" class="mm-button" :disabled="writing" @click="dismiss">
          {{ t('rankingRepeatedRounds.cancel') }}
        </button>
      </div>
    </form>
    <button
      v-else-if="repeatEnabled"
      ref="opener"
      type="button"
      class="mm-button"
      :disabled="blockWrite"
      @click="show"
    >
      {{ t('rankingRepeatedRounds.open') }}
    </button>
    <p v-if="writing || checking" role="status">{{ t('rankingRepeatedRounds.working') }}</p>
    <p v-else-if="feedback" :id="errorId" role="alert">
      {{ t(`rankingRepeatedRounds.${feedback}`) }}
    </p>
  </section>
</template>
<style scoped>
.mm-new-round {
  margin: 12px 0;
  min-width: 0;
  overflow-wrap: anywhere;
}
.mm-new-round-form {
  display: grid;
  gap: 8px;
}
.mm-new-round-form p {
  margin: 0;
  color: var(--mm-muted);
}
.mm-new-round-form textarea {
  padding: 10px;
  border: 1px solid var(--mm-border);
  background: var(--mm-surface);
  color: var(--mm-text);
  border-radius: 10px;
  min-width: 0;
  max-width: 100%;
  resize: vertical;
}
.mm-new-round-form textarea:focus-visible {
  outline: 2px solid #00f6ff;
  outline-offset: 2px;
}
.mm-new-round-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
