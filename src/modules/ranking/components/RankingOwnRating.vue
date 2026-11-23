<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import catalog, { type OwnRating } from '../services/RankingCatalogService';
import writeOwnRating, {
  validOwnScore,
  type RatingIntent,
} from '../services/RankingOwnRatingService';

const props = defineProps<{
  rankingId: string;
  roundId: string;
  targetLabel: string;
  canRate: boolean;
  reconcile: boolean;
}>();
const emit = defineEmits<{
  scopeLost: [status: number];
  reconciliation: [required: boolean];
  confirmed: [];
  interaction: [state: 'idle' | 'draft' | 'pending'];
}>();
const { t } = useI18n();
const inputId = useId(),
  messageId = useId();
const own = ref<OwnRating | null>(null);
const mode = ref<RatingIntent | null>(null);
const draft = ref('');
const pending = ref(false);
const archived = ref(false);
const feedback = ref('');
watch(
  () => (pending.value ? 'pending' : mode.value ? 'draft' : 'idle'),
  (state) => emit('interaction', state),
  { flush: 'sync' },
);
const field = ref<HTMLInputElement>();
const readButton = ref<HTMLButtonElement>();
let action: HTMLElement | undefined;
let epoch = 0;
let controller: AbortController | undefined;
function reset() {
  epoch++;
  controller?.abort();
  pending.value = false;
  own.value = null;
  mode.value = null;
  draft.value = '';
  archived.value = false;
  feedback.value = '';
}
watch(() => [props.rankingId, props.roundId], reset, { flush: 'sync' });
watch(
  () => props.canRate,
  (value) => {
    if (!value) mode.value = null;
  },
);
onBeforeUnmount(reset);
const details = (e: unknown) =>
  (e as { response?: { status?: number; data?: { data?: { code?: string } } } })?.response;
function scopeLoss(status: number | undefined): status is number {
  return status === 401 || status === 403 || status === 404;
}
async function read() {
  if (pending.value) return;
  const started = epoch;
  controller = new AbortController();
  pending.value = true;
  feedback.value = '';
  mode.value = null;
  try {
    const value = await catalog.ownRating(props.rankingId, props.roundId, controller.signal);
    if (started !== epoch) return;
    own.value = value;
    emit('reconciliation', false);
  } catch (e) {
    if (started !== epoch) return;
    own.value = null;
    const status = details(e)?.status;
    if (scopeLoss(status)) emit('scopeLost', status);
    else feedback.value = props.reconcile ? 'uncertain' : 'loadError';
  } finally {
    if (started === epoch) pending.value = false;
  }
}
async function edit(intent: RatingIntent, event: MouseEvent) {
  if (
    !props.canRate ||
    archived.value ||
    props.reconcile ||
    pending.value ||
    (intent === 'edit' && !own.value)
  )
    return;
  action = event.currentTarget as HTMLElement;
  mode.value = intent;
  feedback.value = '';
  draft.value =
    intent === 'edit' && validOwnScore(own.value?.score) ? String(own.value?.score) : '';
  await nextTick();
  field.value?.focus();
}
async function dismiss() {
  if (pending.value) return;
  mode.value = null;
  feedback.value = '';
  draft.value = '';
  await nextTick();
  (action?.isConnected ? action : readButton.value)?.focus();
}
async function save() {
  if (!mode.value || !props.canRate || archived.value || props.reconcile || pending.value) return;
  if (!/^(?:[0-9]|10)$/.test(draft.value)) {
    feedback.value = 'invalid';
    field.value?.focus();
    return;
  }
  const started = epoch,
    intent = mode.value;
  pending.value = true;
  feedback.value = '';
  emit('reconciliation', true);
  try {
    const value = await writeOwnRating(props.rankingId, props.roundId, intent, Number(draft.value));
    if (started !== epoch) return;
    own.value = value;
    mode.value = null;
    draft.value = '';
    emit('reconciliation', false);
    emit('confirmed');
    feedback.value = 'saved';
  } catch (e) {
    if (started !== epoch) return;
    const response = details(e),
      status = response?.status,
      code = response?.data?.data?.code;
    if (scopeLoss(status)) {
      emit('reconciliation', false);
      emit('scopeLost', status);
    } else if (status === 400 && code === 'ranking.invalid_rating') {
      emit('reconciliation', false);
      feedback.value = 'invalid';
    } else if (status === 409 && code === 'ranking.archived_read_only') {
      emit('reconciliation', false);
      archived.value = true;
      mode.value = null;
      feedback.value = 'archived';
    } else {
      own.value = null;
      mode.value = null;
      feedback.value =
        status === 409 && code === 'ranking.rating_exists' ? 'duplicate' : 'uncertain';
    }
  } finally {
    if (started === epoch) {
      pending.value = false;
      await nextTick();
      if (started === epoch) {
        if (mode.value) field.value?.focus();
        else readButton.value?.focus();
      }
    }
  }
}
</script>
<template>
  <div class="mm-own-rating" :aria-busy="pending">
    <p v-if="own">
      {{ t('rankingDetail.ownScore') }}:
      {{ own.score === null ? t('rankingDetail.noNumericScore') : own.score }}
    </p>
    <div class="mm-own-actions">
      <button
        ref="readButton"
        type="button"
        class="mm-button"
        :disabled="pending || Boolean(mode)"
        @click="read"
      >
        {{ t(reconcile ? 'rankingOwnRating.check' : 'rankingDetail.own') }}
      </button>
      <button
        v-if="canRate && !reconcile && !archived && !mode"
        type="button"
        class="mm-button"
        :disabled="pending"
        @click="edit(own ? 'edit' : 'create', $event)"
      >
        {{ t(own ? 'rankingOwnRating.edit' : 'rankingOwnRating.add') }}
      </button>
    </div>
    <form
      v-if="mode"
      class="mm-own-form"
      @submit.prevent="save"
      @keydown.esc.prevent.stop="dismiss"
      novalidate
    >
      <p>{{ targetLabel }}</p>
      <label :for="inputId">{{ t('rankingOwnRating.score') }}</label>
      <input
        :id="inputId"
        ref="field"
        v-model="draft"
        class="mm-own-input"
        inputmode="numeric"
        autocomplete="off"
        :disabled="pending"
        :aria-invalid="feedback === 'invalid'"
        :aria-describedby="feedback === 'invalid' ? messageId : undefined"
      />
      <div class="mm-own-actions">
        <button type="submit" class="mm-button mm-button-primary" :disabled="pending">
          {{ t(mode === 'create' ? 'rankingOwnRating.create' : 'rankingOwnRating.save') }}
        </button>
        <button type="button" class="mm-button" :disabled="pending" @click="dismiss">
          {{ t('rankingOwnRating.cancel') }}
        </button>
      </div>
    </form>
    <p v-if="pending" role="status">{{ t('rankingDetail.loading') }}</p>
    <p
      v-else-if="feedback || reconcile"
      :id="messageId"
      :role="feedback === 'saved' ? 'status' : 'alert'"
    >
      {{ t(`rankingOwnRating.${feedback || 'uncertain'}`) }}
    </p>
  </div>
</template>
<style scoped>
.mm-own-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.mm-own-form {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}
.mm-own-form p {
  margin: 0;
  overflow-wrap: anywhere;
}
.mm-own-input {
  width: min(100%, 12rem);
  min-height: 44px;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid var(--mm-border);
  background: var(--mm-surface);
  color: var(--mm-text);
}
.mm-own-input:focus-visible {
  outline: 2px solid #00f6ff;
  outline-offset: 2px;
}
</style>
