<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useUserStore } from '~/core/stores/UserStore';
import BaseContainerMain from '~/core/components/BaseContainerMain.vue';
import RankingOwnRating from '../components/RankingOwnRating.vue';
import catalog, {
  entryTitle,
  type RankingEntry,
  type RankingRound,
  type RatingAggregate,
} from '../services/RankingCatalogService';
const props = defineProps<{ rankingId: string }>();
const { t, locale } = useI18n();
const user = useUserStore();
const entries = ref<RankingEntry[]>([]);
const cursor = ref<string | null>(null);
const loading = ref(false);
const error = ref('');
const selected = ref<RankingEntry | null>(null);
const rounds = ref<RankingRound[]>([]);
const roundCursor = ref<number | null>(null);
const detailLoading = ref(false);
const detailError = ref('');
const aggregate = ref<RatingAggregate | null>(null);
const canRate = ref(false);
const rankingName = ref<string | null | undefined>(undefined);
const uncertain = ref(new Set<string>());
let aggregateEpoch = 0;
let epoch = 0,
  selection = 0,
  mounted = false;
let controller: AbortController | undefined, detailController: AbortController | undefined;
function message(e: unknown) {
  const status = (e as { response?: { status?: number } })?.response?.status;
  return status === 404 || status === 403
    ? 'unavailable'
    : status === 401
      ? 'sessionExpired'
      : 'loadError';
}
function clearDetail() {
  selection++;
  detailController?.abort();
  selected.value = null;
  rounds.value = [];
  roundCursor.value = null;
  aggregate.value = null;
  aggregateEpoch++;
  detailError.value = '';
  detailLoading.value = false;
}
async function load(more = false) {
  if (loading.value || !user.user.isLoged) return;
  const started = epoch;
  controller = new AbortController();
  loading.value = true;
  error.value = '';
  try {
    const access = await catalog.summary(props.rankingId, controller.signal);
    const page = await catalog.entries(
      props.rankingId,
      more ? cursor.value || undefined : undefined,
      controller.signal,
    );
    if (started !== epoch) return;
    rankingName.value = access.name;
    canRate.value = access.capabilities.includes('RATE_OWN');
    entries.value = [
      ...new Map(
        [...(more ? entries.value : []), ...page.items].map((e) => [e.entry_id, e]),
      ).values(),
    ];
    cursor.value = more && page.next_cursor === cursor.value ? null : page.next_cursor;
  } catch (e) {
    if (started === epoch) {
      error.value = message(e);
      if (error.value === 'unavailable' || error.value === 'sessionExpired') {
        canRate.value = false;
        rankingName.value = undefined;
        entries.value = [];
        cursor.value = null;
        clearDetail();
      }
    }
  } finally {
    if (started === epoch) loading.value = false;
  }
}
function reset() {
  epoch++;
  controller?.abort();
  clearDetail();
  canRate.value = false;
  rankingName.value = undefined;
  uncertain.value.clear();
  entries.value = [];
  cursor.value = null;
  loading.value = false;
  error.value = '';
  if (mounted) void load();
}
watch(() => [props.rankingId, user.user.generation, user.user.isLoged], reset, { flush: 'sync' });
onMounted(() => {
  mounted = true;
  reset();
});
onBeforeUnmount(() => {
  mounted = false;
  epoch++;
  controller?.abort();
  clearDetail();
});
async function open(entry: RankingEntry, more = false) {
  if (more && detailLoading.value) return;
  if (!more) {
    clearDetail();
    selected.value = entry;
  }
  const started = epoch,
    current = selection;
  detailController = new AbortController();
  detailLoading.value = true;
  detailError.value = '';
  try {
    const page = await catalog.rounds(
      props.rankingId,
      entry.entry_id,
      more ? (roundCursor.value ?? undefined) : undefined,
      detailController.signal,
    );
    const summary = more
      ? aggregate.value
      : await catalog.aggregate(props.rankingId, entry.entry_id, detailController.signal);
    if (started !== epoch || current !== selection) return;
    rounds.value = [
      ...new Map(
        [...(more ? rounds.value : []), ...page.items].map((r) => [r.round_id, r]),
      ).values(),
    ];
    roundCursor.value = more && page.next_cursor === roundCursor.value ? null : page.next_cursor;
    aggregate.value = summary;
  } catch (e) {
    if (started === epoch && current === selection) {
      detailError.value = message(e);
      if (detailError.value === 'unavailable' || detailError.value === 'sessionExpired') {
        rounds.value = [];
        aggregate.value = null;
        aggregateEpoch++;
        roundCursor.value = null;
      }
    }
  } finally {
    if (started === epoch && current === selection) detailLoading.value = false;
  }
}
async function lostScope(status: number) {
  const previousId = selected.value?.entry_id;
  epoch++;
  const started = epoch;
  controller?.abort();
  canRate.value = false;
  rankingName.value = undefined;
  entries.value = [];
  cursor.value = null;
  loading.value = false;
  clearDetail();
  error.value = status === 401 ? 'sessionExpired' : 'ownUnavailable';
  // Own-rating 404 deliberately conflates absent rating and lost access. Never infer either:
  // revalidate canonical access/entries before offering independent actions again.
  if (status !== 404) return;
  await load();
  if (started !== epoch || error.value) return;
  const current = entries.value.find((entry) => entry.entry_id === previousId);
  if (current) {
    await open(current);
    if (started === epoch && !detailError.value) detailError.value = 'ownUnavailable';
  } else if (started === epoch) error.value = 'ownUnavailable';
}
function markReconcile(roundId: string, required: boolean) {
  if (required) uncertain.value.add(roundId);
  else uncertain.value.delete(roundId);
}
async function refreshAggregate() {
  if (detailError.value === 'ownUnavailable') detailError.value = '';
  if (!selected.value) return;
  const started = ++aggregateEpoch;
  const context = selection;
  const entry = selected.value.entry_id;
  aggregate.value = null;
  try {
    const result = await catalog.aggregate(props.rankingId, entry, detailController?.signal);
    if (started === aggregateEpoch && context === selection) aggregate.value = result;
  } catch (error) {
    if (started !== aggregateEpoch || context !== selection) return;
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 401 || status === 403 || status === 404) lostScope(status);
    else detailError.value = 'loadError';
  }
}
</script>
<template>
  <BaseContainerMain>
    <NuxtLink to="/rankings" class="mm-detail-back">{{ t('rankingDetail.back') }}</NuxtLink>
    <header>
      <h1>
        {{
          rankingName === undefined
            ? t('rankingDetail.title')
            : rankingName || t('rankings.unnamed')
        }}
      </h1>
      <p class="mm-detail-scope">{{ rankingId }}</p>
      <p>{{ t('rankingOwnRating.intro') }}</p>
    </header>
    <p v-if="loading && !entries.length" role="status">{{ t('rankingDetail.loading') }}</p>
    <div v-if="error" role="alert">
      <p>{{ t(`rankingDetail.${error}`) }}</p>
      <button class="mm-button" :disabled="loading" @click="load(Boolean(entries.length))">
        {{ t('rankingDetail.retry') }}
      </button>
    </div>
    <p v-else-if="!loading && !entries.length">{{ t('rankingDetail.empty') }}</p>
    <div class="mm-detail-layout">
      <section :aria-label="t('rankingDetail.catalog')" :aria-busy="loading">
        <ul class="mm-detail-catalog">
          <li v-for="entry in entries" :key="entry.entry_id">
            <button
              class="mm-detail-entry"
              :aria-pressed="selected?.entry_id === entry.entry_id"
              @click="open(entry)"
            >
              <span>{{ entryTitle(entry, locale, t('rankingDetail.untitled')) }}</span
              ><small v-if="entry.release_date">{{ entry.release_date }}</small>
            </button>
          </li>
        </ul>
        <button v-if="cursor" class="mm-button" :disabled="loading" @click="load(true)">
          {{ t('rankingDetail.more') }}
        </button>
      </section>
      <section
        v-if="selected"
        class="mm-detail-panel"
        :aria-busy="detailLoading"
        :aria-label="t('rankingDetail.rounds')"
      >
        <h2>{{ entryTitle(selected, locale, t('rankingDetail.untitled')) }}</h2>
        <p v-if="detailLoading" role="status">{{ t('rankingDetail.loading') }}</p>
        <div v-if="detailError" role="alert">
          <p>{{ t(`rankingDetail.${detailError}`) }}</p>
          <button class="mm-button" :disabled="detailLoading" @click="open(selected)">
            {{ t('rankingDetail.retry') }}
          </button>
        </div>
        <template v-if="aggregate">
          <p v-if="aggregate.partial">{{ t('rankingDetail.partial') }}</p>
          <p v-else-if="aggregate.votes === 0n">{{ t('rankingDetail.unrated') }}</p>
          <p v-else>
            {{ t('rankingDetail.mean') }}:
            <strong>{{ aggregate.total.toString() }} / {{ aggregate.votes.toString() }}</strong
            ><small class="mm-detail-exact">{{ t('rankingDetail.exactRatio') }}</small>
          </p>
        </template>
        <p v-if="!detailLoading && !detailError && !rounds.length">
          {{ t('rankingDetail.noRounds') }}
        </p>
        <ol class="mm-detail-rounds">
          <li v-for="round in rounds" :key="round.round_id">
            <h3>{{ t('rankingDetail.round', { number: round.number }) }}</h3>
            <p v-if="round.description" class="mm-detail-description">{{ round.description }}</p>
            <p>
              {{
                t(
                  round.revealed === true
                    ? 'rankingDetail.revealed'
                    : round.revealed === false
                      ? 'rankingDetail.hidden'
                      : 'rankingDetail.unknownReveal',
                )
              }}
            </p>
            <RankingOwnRating
              :ranking-id="rankingId"
              :round-id="round.round_id"
              :target-label="`${entryTitle(selected, locale, t('rankingDetail.untitled'))} · ${t('rankingDetail.round', { number: round.number })}`"
              :can-rate="canRate"
              :reconcile="uncertain.has(round.round_id)"
              @scope-lost="lostScope"
              @reconciliation="markReconcile(round.round_id, $event)"
              @confirmed="refreshAggregate"
            />
          </li>
        </ol>
        <button
          v-if="roundCursor !== null"
          class="mm-button"
          :disabled="detailLoading"
          @click="open(selected, true)"
        >
          {{ t('rankingDetail.moreRounds') }}
        </button>
      </section>
    </div>
  </BaseContainerMain>
</template>
<style scoped>
.mm-detail-back {
  display: inline-block;
  padding: 12px 0;
}
.mm-detail-scope {
  font-size: 0.8rem;
  color: var(--mm-muted);
  overflow-wrap: anywhere;
}
.mm-detail-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr);
  gap: 24px;
  align-items: start;
}
.mm-detail-catalog,
.mm-detail-rounds {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 12px;
}
.mm-detail-entry {
  width: 100%;
  display: grid;
  text-align: left;
  gap: 8px;
  padding: 20px;
  border: 1px solid var(--mm-border);
  background: var(--mm-surface);
  color: var(--mm-text);
  border-radius: 16px;
  cursor: pointer;
  overflow-wrap: anywhere;
}
.mm-detail-entry[aria-pressed='true'] {
  border-color: #00f6ff;
}
.mm-detail-entry:focus-visible {
  outline: 2px solid #00f6ff;
  outline-offset: 3px;
}
.mm-detail-entry span {
  font-weight: 700;
  font-size: 1.1rem;
}
.mm-detail-entry small,
.mm-detail-exact {
  color: var(--mm-muted);
}
.mm-detail-panel {
  min-width: 0;
  border: 1px solid var(--mm-border);
  padding: 24px;
  border-radius: 20px;
  background: var(--mm-surface);
  overflow-wrap: anywhere;
}
.mm-detail-panel h2 {
  margin-top: 0;
}
.mm-detail-rounds li {
  border-top: 1px solid var(--mm-border);
  padding-top: 12px;
}
.mm-detail-description {
  white-space: pre-wrap;
}
.mm-detail-exact {
  display: block;
  margin-top: 6px;
}
.mm-detail-layout section {
  min-width: 0;
}
.mm-detail-panel p {
  line-height: 1.6;
}
@media (max-width: 1000px) {
  .mm-detail-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
