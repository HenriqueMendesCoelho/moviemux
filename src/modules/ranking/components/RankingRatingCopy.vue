<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useUserStore } from '~/core/stores/UserStore';
import collections, { type RankingSummary } from '../services/RankingService';
import catalog, { type RankingRound } from '../services/RankingCatalogService';
import copy, {
  RankingRatingCopyError,
  type RatingCopyPreview,
  type RatingCopyScope,
} from '../services/RankingRatingCopyService';

const props = defineProps<{ destination: RatingCopyScope; movieId: string; blocked?: boolean }>();
const emit = defineEmits<{
  interaction: [state: 'idle' | 'draft' | 'pending' | 'uncertain'];
  confirmed: [];
  scopeLost: [status: number];
}>();
const { t, locale } = useI18n();
const user = useUserStore();
const opened = ref(false),
  reading = ref(false),
  applying = ref(false);
const directory = ref<RankingSummary[]>([]);
const directoryCursor = ref<string | null>(null);
const collection = shallowRef<RankingSummary | null>(null);
const entryId = ref('');
const entriesCursor = ref<string | null>(null);
const rounds = ref<RankingRound[]>([]);
const roundCursor = ref<number | null>(null);
const source = shallowRef<RankingRound | null>(null);
const prepared = shallowRef<Extract<RatingCopyPreview, { status: 'READY' }> | null>(null);
const notice = ref('');
const currentNote = ref<{ score: number | null }>();
const canReadCurrent = ref(false);
const opener = ref<HTMLButtonElement>();
const panel = ref<HTMLElement>();
let epoch = 0;
let request: AbortController | undefined;
let expiry: ReturnType<typeof setTimeout> | undefined;

const state = computed(() =>
  applying.value
    ? 'pending'
    : notice.value === 'uncertain'
      ? 'uncertain'
      : opened.value
        ? 'draft'
        : 'idle',
);
watch(state, (value) => emit('interaction', value), { flush: 'sync' });
const label = (value: RankingSummary) => value.name || t('rankings.unnamed');

function clearPreview() {
  if (expiry !== undefined) clearTimeout(expiry);
  expiry = undefined;
  prepared.value = null;
}
function resetSelection() {
  clearPreview();
  collection.value = null;
  entryId.value = '';
  entriesCursor.value = null;
  rounds.value = [];
  roundCursor.value = null;
  source.value = null;
  currentNote.value = undefined;
  canReadCurrent.value = false;
  notice.value = '';
}
function reset() {
  epoch++;
  request?.abort();
  request = undefined;
  reading.value = false;
  applying.value = false;
  opened.value = false;
  directory.value = [];
  directoryCursor.value = null;
  resetSelection();
}
watch(
  [
    () => props.destination.rankingId,
    () => props.destination.entryId,
    () => props.destination.roundId,
    () => props.movieId,
    () => user.user.generation,
    () => user.user.isLoged,
  ],
  reset,
  { flush: 'sync' },
);
onBeforeUnmount(reset);

function errorOf(error: unknown) {
  if (error instanceof RankingRatingCopyError) return { status: error.status, code: error.code };
  const response = (
    error as {
      response?: { status?: number; data?: { data?: { code?: string } } };
    }
  )?.response;
  return { status: response?.status, code: response?.data?.data?.code };
}
function denied(error: unknown) {
  const { status, code } = errorOf(error);
  if (status === 401) {
    reset();
    emit('scopeLost', 401);
    return;
  }
  if (status === 403 || status === 404) {
    resetSelection();
    notice.value = 'unavailable';
  } else if (status === 503 && code === 'ranking.rating_copy_unavailable') {
    notice.value = 'disabled';
  } else if (status === 409 && code === 'ranking.rating_exists') {
    canReadCurrent.value = true;
    notice.value = 'occupied';
  } else if (status === 409 && code === 'ranking.rating_copy_stale') {
    notice.value = 'stale';
  } else notice.value = 'failed';
}
async function read(fn: (signal: AbortSignal, valid: () => boolean) => Promise<void>) {
  if (!opened.value || reading.value || applying.value || !user.user.isLoged) return;
  const started = epoch;
  const controller = new AbortController();
  request?.abort();
  request = controller;
  const valid = () => started === epoch && !controller.signal.aborted;
  reading.value = true;
  try {
    await fn(controller.signal, valid);
  } catch (error) {
    if (valid()) denied(error);
  } finally {
    if (valid()) reading.value = false;
  }
}
async function listCollections(more = false) {
  if (more && !directoryCursor.value) return;
  notice.value = '';
  await read(async (signal, valid) => {
    const after = more ? directoryCursor.value || undefined : undefined;
    const page = await collections.list(after, signal);
    if (!valid()) return;
    const candidates = page.items.filter(
      (item) =>
        item.ranking_id !== props.destination.rankingId && item.capabilities.includes('READ'),
    );
    directory.value = [
      ...new Map(
        [...(more ? directory.value : []), ...candidates].map((item) => [item.ranking_id, item]),
      ).values(),
    ];
    directoryCursor.value = page.next_cursor !== after ? page.next_cursor : null;
  });
}
async function open() {
  if (props.blocked || opened.value || !user.user.isLoged) return;
  opened.value = true;
  await nextTick();
  panel.value?.focus();
  await listCollections();
}
async function close() {
  if (applying.value) return;
  reset();
  await nextTick();
  opener.value?.focus();
}
async function entries(more = false) {
  const rank = collection.value?.ranking_id;
  if (!rank || (more && !entriesCursor.value)) return;
  await read(async (signal, valid) => {
    const after = more ? entriesCursor.value || undefined : undefined;
    const page = await catalog.entries(rank, after, signal);
    if (!valid()) return;
    const match = page.items.find((item) => item.movie_id === props.movieId);
    entriesCursor.value = page.next_cursor !== after ? page.next_cursor : null;
    if (!match) {
      notice.value = entriesCursor.value ? 'notOnPage' : 'movieUnavailable';
      return;
    }
    entryId.value = match.entry_id;
    entriesCursor.value = null;
    const result = await catalog.rounds(rank, match.entry_id, undefined, signal);
    if (!valid()) return;
    rounds.value = result.items;
    roundCursor.value = result.next_cursor;
  });
}
async function pickCollection(item: RankingSummary) {
  if (props.blocked || reading.value || applying.value || currentNote.value || canReadCurrent.value)
    return;
  resetSelection();
  collection.value = item;
  await entries();
}
async function loadRounds() {
  const rank = collection.value?.ranking_id,
    entry = entryId.value,
    after = roundCursor.value;
  if (!rank || !entry || !after) return;
  await read(async (signal, valid) => {
    const page = await catalog.rounds(rank, entry, after, signal);
    if (!valid()) return;
    rounds.value = [
      ...new Map([...rounds.value, ...page.items].map((item) => [item.round_id, item])).values(),
    ];
    roundCursor.value = page.next_cursor !== after ? page.next_cursor : null;
  });
}
async function preview(value: RankingRound) {
  const rank = collection.value?.ranking_id,
    entry = entryId.value;
  if (!rank || !entry || props.blocked || reading.value || applying.value || canReadCurrent.value)
    return;
  clearPreview();
  source.value = value;
  notice.value = '';
  await read(async (signal, valid) => {
    const result = await copy.preview(
      props.destination,
      { rankingId: rank, entryId: entry, roundId: value.round_id },
      signal,
    );
    if (!valid()) return;
    if (result.status !== 'READY') {
      notice.value = result.status === 'DESTINATION_EXISTS' ? 'occupied' : 'sourceUnavailable';
      canReadCurrent.value = result.status === 'DESTINATION_EXISTS';
      return;
    }
    const remain = Date.parse(result.expires_at) - Date.now();
    if (!Number.isFinite(remain) || remain <= 0) {
      notice.value = 'stale';
      return;
    }
    prepared.value = result;
    expiry = setTimeout(
      () => {
        clearPreview();
        notice.value = 'stale';
      },
      Math.min(remain, 2_147_483_647),
    );
  });
}
async function readOwn() {
  if (!canReadCurrent.value || reading.value || applying.value) return;
  await read(async (signal, valid) => {
    try {
      const own = await catalog.ownRating(
        props.destination.rankingId,
        props.destination.roundId,
        signal,
      );
      if (valid()) currentNote.value = own;
    } catch (error) {
      if (!valid()) return;
      if (errorOf(error).status === 401) denied(error);
      else currentNote.value = undefined; // 404 cannot distinguish denied from absent.
    }
  });
}
async function apply() {
  const ready = prepared.value;
  if (
    !opened.value ||
    props.blocked ||
    !ready ||
    applying.value ||
    reading.value ||
    !user.user.isLoged
  )
    return;
  if (Date.parse(ready.expires_at) <= Date.now()) {
    clearPreview();
    notice.value = 'stale';
    return;
  }
  const start = epoch;
  const token = ready.preview_token;
  clearPreview();
  applying.value = true;
  notice.value = '';
  try {
    await copy.apply(props.destination, token);
    if (start !== epoch) return;
    notice.value = 'copied';
    canReadCurrent.value = true;
    emit('confirmed');
  } catch (error) {
    if (start !== epoch) return;
    const { status, code } = errorOf(error);
    if (
      status === 401 ||
      status === 403 ||
      status === 404 ||
      (status === 409 &&
        (code === 'ranking.rating_copy_stale' || code === 'ranking.rating_exists')) ||
      (status === 503 && code === 'ranking.rating_copy_unavailable')
    )
      denied(error);
    else {
      notice.value = 'uncertain';
      canReadCurrent.value = true;
    }
  } finally {
    if (start === epoch) applying.value = false;
  }
  if (start === epoch && canReadCurrent.value) await readOwn();
}
const expiryText = computed(() =>
  prepared.value
    ? new Intl.DateTimeFormat(locale.value, { dateStyle: 'short', timeStyle: 'short' }).format(
        new Date(prepared.value.expires_at),
      )
    : '',
);
</script>

<template>
  <div class="mm-rating-copy">
    <button
      v-if="!opened"
      ref="opener"
      type="button"
      class="mm-button"
      :disabled="blocked"
      @click="open"
    >
      {{ t('rankingRatingCopy.open') }}
    </button>
    <section
      v-else
      ref="panel"
      tabindex="-1"
      :aria-label="t('rankingRatingCopy.open')"
      :aria-busy="reading || applying"
    >
      <button type="button" class="mm-button" :disabled="applying" @click="close">
        {{ t('rankingRatingCopy.close') }}
      </button>
      <p>{{ t('rankingRatingCopy.hint') }}</p>
      <template v-if="!canReadCurrent">
        <h4>{{ t('rankingRatingCopy.sourceCollection') }}</h4>
        <ul>
          <li v-for="item in directory" :key="item.ranking_id">
            <button
              type="button"
              class="mm-button"
              :aria-pressed="collection?.ranking_id === item.ranking_id"
              :disabled="reading || applying || blocked"
              @click="pickCollection(item)"
            >
              {{ label(item) }}
            </button>
          </li>
        </ul>
        <p v-if="!reading && !directory.length && !directoryCursor && !notice">
          {{ t('rankingRatingCopy.empty') }}
        </p>
        <button
          v-if="directoryCursor"
          type="button"
          class="mm-button"
          :disabled="reading || applying"
          @click="listCollections(true)"
        >
          {{ t('rankings.more') }}
        </button>
        <button
          v-if="entriesCursor && !entryId"
          type="button"
          class="mm-button"
          :disabled="reading || applying"
          @click="entries(true)"
        >
          {{ t('rankingRatingCopy.moreMovies') }}
        </button>
        <template v-if="entryId && rounds.length">
          <h4>{{ t('rankingRatingCopy.sourceRound') }}</h4>
          <ul>
            <li v-for="round in rounds" :key="round.round_id">
              <button
                type="button"
                class="mm-button"
                :aria-pressed="source?.round_id === round.round_id"
                :disabled="reading || applying || blocked"
                @click="preview(round)"
              >
                {{ t('rankingDetail.round', { number: round.number })
                }}<span v-if="round.description">: {{ round.description }}</span>
              </button>
            </li>
          </ul>
          <button
            v-if="roundCursor"
            type="button"
            class="mm-button"
            :disabled="reading || applying"
            @click="loadRounds"
          >
            {{ t('rankings.more') }}
          </button>
        </template>
        <div v-if="prepared" aria-live="polite">
          <p>
            {{
              t('rankingRatingCopy.preview', { score: prepared.source_score, expiry: expiryText })
            }}
          </p>
          <button
            type="button"
            class="mm-button mm-button-primary"
            :disabled="reading || applying || blocked"
            @click="apply"
          >
            {{ t('rankingRatingCopy.confirm') }}
          </button>
        </div>
      </template>
      <p v-if="reading || applying" role="status">{{ t('rankingRatingCopy.working') }}</p>
      <p v-if="notice" :role="notice === 'copied' ? 'status' : 'alert'">
        {{ t('rankingRatingCopy.' + notice) }}
      </p>
      <template v-if="canReadCurrent">
        <p v-if="currentNote" role="status">
          {{
            currentNote.score === null
              ? t('rankingRatingCopy.unrated')
              : t('rankingRatingCopy.current', { score: currentNote.score })
          }}
        </p>
        <p v-else-if="!reading">{{ t('rankingRatingCopy.unverified') }}</p>
        <button type="button" class="mm-button" :disabled="reading || applying" @click="readOwn">
          {{ t('rankingRatingCopy.check') }}
        </button>
      </template>
    </section>
  </div>
</template>
<style scoped>
.mm-rating-copy {
  margin-block: 12px;
  min-width: 0;
  overflow-wrap: anywhere;
}
.mm-rating-copy section {
  border-inline-start: 2px solid var(--mm-border);
  padding-inline-start: 12px;
}
.mm-rating-copy button {
  max-width: 100%;
  white-space: normal;
  overflow-wrap: anywhere;
  text-align: start;
}
.mm-rating-copy ul {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0;
  list-style: none;
}
.mm-rating-copy li {
  min-width: 0;
  max-width: 100%;
}
</style>
