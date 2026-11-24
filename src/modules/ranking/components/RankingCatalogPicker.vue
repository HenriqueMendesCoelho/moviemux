<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useUserStore } from '~/core/stores/UserStore';
import RankingTmdbPicker from './RankingTmdbPicker.vue';
import catalog from '../services/RankingCatalogService';
import picker, {
  CatalogPickerError,
  catalogPickerQuery,
  type CatalogPickerLanguage,
  type CatalogPickerMovie,
} from '../services/RankingCatalogPickerService';
import type { ImportReceipt } from '../services/RankingTmdbPickerService';

const props = defineProps<{ rankingId: string; canAdd: boolean; providerEnabled: boolean }>();
const emit = defineEmits<{
  imported: [result: ImportReceipt & { rankingId: string }];
  scopeLost: [status: number];
  interaction: [state: 'idle' | 'draft' | 'pending' | 'uncertain'];
}>();
const { t, locale } = useI18n();
const user = useUserStore();
const titleId = useId();
const queryId = useId();
const errorId = useId();
const opener = ref<HTMLButtonElement>();
const field = ref<HTMLInputElement>();
const opened = ref(false);
const query = ref('');
const requestResult = ref<{
  items: CatalogPickerMovie[];
  page: number;
  has_more: boolean;
  query: string;
  language: CatalogPickerLanguage;
}>();
const issue = ref('');
const notice = ref('');
const searching = ref(false);
const writing = ref(false);
const checking = ref(false);
const providerQuery = ref('');
const providerLanguage = ref<CatalogPickerLanguage>();
const providerState = ref<'idle' | 'draft' | 'pending' | 'uncertain'>('idle');
const unresolved = ref<{ movieId: string; reviewed: boolean }>();
const language = computed<CatalogPickerLanguage>(() =>
  locale.value === 'pt-BR' ? 'pt-BR' : 'en-US',
);
const allowed = computed(() => props.canAdd && user.user.isLoged);
const interaction = computed(() =>
  writing.value || providerState.value === 'pending'
    ? 'pending'
    : unresolved.value || providerState.value === 'uncertain'
      ? 'uncertain'
      : opened.value && (query.value || providerState.value === 'draft')
        ? 'draft'
        : 'idle',
);
watch(interaction, (value) => emit('interaction', value), { flush: 'sync' });
let epoch = 0;
let searchRevision = 0;
let searchRequest: AbortController | undefined;
let verifyRequest: AbortController | undefined;

function clearSearch() {
  searchRevision++;
  searchRequest?.abort();
  searching.value = false;
  requestResult.value = undefined;
  issue.value = '';
}
function reset() {
  epoch++;
  clearSearch();
  verifyRequest?.abort();
  opened.value = false;
  query.value = '';
  writing.value = false;
  checking.value = false;
  unresolved.value = undefined;
  clearProvider();
  providerState.value = 'idle';
  notice.value = '';
}
watch(
  [() => props.rankingId, () => props.canAdd, () => user.user.generation, () => user.user.isLoged],
  reset,
  { flush: 'sync' },
);
function clearProvider() {
  providerQuery.value = '';
  providerLanguage.value = undefined;
}
function expireProvider() {
  if (
    providerQuery.value &&
    providerState.value !== 'pending' &&
    providerState.value !== 'uncertain' &&
    (!props.providerEnabled ||
      providerLanguage.value !== language.value ||
      catalogPickerQuery(query.value) !== providerQuery.value)
  )
    clearProvider();
}
watch(
  [query, language],
  () => {
    clearSearch();
    expireProvider();
  },
  { flush: 'sync' },
);
// If locale/query/gate changed during an in-flight write, retain reconciliation only
// until it settles, then require a fresh successful internal search.
watch([providerState, () => props.providerEnabled], expireProvider, { flush: 'sync' });
onBeforeUnmount(reset);

async function open() {
  if (!allowed.value || opened.value) return;
  opened.value = true;
  await nextTick();
  field.value?.focus();
}
async function close() {
  if (writing.value || checking.value || unresolved.value || providerQuery.value) return;
  reset();
  await nextTick();
  opener.value?.focus();
}
function denied(status: number) {
  reset();
  emit('scopeLost', status);
}
function errorOf(error: unknown) {
  if (error instanceof CatalogPickerError) return { status: error.status, code: error.code };
  const response = (error as { response?: { status?: number } })?.response;
  return { status: response?.status, code: undefined };
}
function synchronizeDenial(error: unknown) {
  const { status, code } = errorOf(error);
  if (
    status === 401 ||
    status === 403 ||
    status === 404 ||
    (status === 409 && code === 'ranking.archived_read_only')
  ) {
    denied(status);
    return true;
  }
  return false;
}
async function search(page = 1) {
  if (
    !allowed.value ||
    !opened.value ||
    searching.value ||
    writing.value ||
    unresolved.value ||
    providerQuery.value
  )
    return;
  const text = catalogPickerQuery(query.value);
  if (text === null) {
    issue.value = 'invalid';
    field.value?.focus();
    return;
  }
  const start = epoch;
  const localeAtStart = language.value;
  const request = new AbortController();
  clearSearch();
  const version = searchRevision;
  searchRequest = request;
  searching.value = true;
  notice.value = '';
  const valid = () => start === epoch && version === searchRevision && !request.signal.aborted;
  try {
    const found = await picker.search(props.rankingId, text, page, localeAtStart, request.signal);
    if (valid()) requestResult.value = { ...found, query: text, language: localeAtStart };
  } catch (error) {
    if (!valid()) return;
    if (!synchronizeDenial(error))
      issue.value = errorOf(error).status === 400 ? 'invalid' : 'searchError';
  } finally {
    if (valid()) searching.value = false;
  }
}
function provider() {
  const result = requestResult.value;
  if (
    !allowed.value ||
    !props.providerEnabled ||
    !result ||
    searching.value ||
    writing.value ||
    unresolved.value ||
    issue.value ||
    result.language !== language.value ||
    result.query !== catalogPickerQuery(query.value)
  )
    return;
  providerLanguage.value = result.language;
  providerQuery.value = result.query;
}
async function returnToCatalog() {
  if (providerState.value === 'pending' || providerState.value === 'uncertain') return;
  clearProvider();
  providerState.value = 'idle';
  await nextTick();
  field.value?.focus();
}
async function attach(movieId: string, retry = false) {
  if (
    !opened.value ||
    !allowed.value ||
    writing.value ||
    searching.value ||
    checking.value ||
    providerQuery.value
  )
    return;
  if (retry) {
    if (!unresolved.value?.reviewed || unresolved.value.movieId !== movieId) return;
    unresolved.value = { movieId, reviewed: false };
  } else if (
    unresolved.value ||
    !requestResult.value?.items.some((movie) => movie.movie_id === movieId)
  )
    return;
  const rank = props.rankingId;
  const start = epoch;
  writing.value = true;
  notice.value = '';
  try {
    const receipt = await picker.add(rank, movieId);
    if (start !== epoch) return;
    unresolved.value = undefined;
    notice.value = receipt.disposition === 'new' ? 'added' : 'present';
    emit('imported', { rankingId: rank, ...receipt });
  } catch (error) {
    if (start !== epoch) return;
    if (synchronizeDenial(error)) return;
    const { status, code } = errorOf(error);
    if (status === 400) notice.value = 'attachError';
    else if (status === 409 && code === 'ranking.entry_recovery_expired') notice.value = 'expired';
    else {
      // A lost response is not proof the attach failed. Never fall back to provider automatically.
      unresolved.value = { movieId, reviewed: false };
      clearSearch();
      notice.value = 'uncertain';
    }
  } finally {
    if (start === epoch) writing.value = false;
  }
}
async function reconcile() {
  const target = unresolved.value;
  if (!target || !allowed.value || checking.value || writing.value) return;
  // A newly started check supersedes any earlier permission to retry.
  unresolved.value = { ...target, reviewed: false };
  const started = epoch;
  const rank = props.rankingId;
  const request = new AbortController();
  verifyRequest?.abort();
  verifyRequest = request;
  const valid = () => started === epoch && !request.signal.aborted;
  checking.value = true;
  try {
    const summary = await catalog.summary(rank, request.signal);
    if (!valid()) return;
    if (!summary.capabilities.includes('READ') || !summary.capabilities.includes('ADD_ENTRY')) {
      denied(403);
      return;
    }
    const page = await catalog.entries(rank, undefined, request.signal);
    if (!valid()) return;
    const match = page.items.find((entry) => entry.movie_id === target.movieId);
    if (match) {
      unresolved.value = undefined;
      notice.value = 'present';
      emit('imported', { rankingId: rank, entryId: match.entry_id, disposition: 'verified' });
    } else {
      // One page cannot prove absence. Only a deliberate same-ID idempotent retry is offered.
      unresolved.value = { ...target, reviewed: true };
      notice.value = 'notConfirmed';
    }
  } catch (error) {
    if (valid() && !synchronizeDenial(error)) notice.value = 'recheckError';
  } finally {
    if (valid()) checking.value = false;
  }
}
</script>

<template>
  <section
    v-if="allowed"
    class="mm-catalog-picker"
    :aria-labelledby="titleId"
    :aria-busy="searching || writing || checking"
  >
    <h2 :id="titleId">{{ t('rankingCatalogPicker.title') }}</h2>
    <button v-if="!opened" ref="opener" type="button" class="mm-button" @click="open">
      {{ t('rankingCatalogPicker.open') }}
    </button>
    <template v-else-if="providerQuery">
      <button
        type="button"
        class="mm-button"
        :disabled="providerState === 'pending' || providerState === 'uncertain'"
        @click="returnToCatalog"
      >
        {{ t('rankingCatalogPicker.returnToCatalog') }}
      </button>
      <RankingTmdbPicker
        :ranking-id="rankingId"
        :can-add="canAdd"
        :enabled="providerEnabled"
        :fixed-query="providerQuery"
        @scope-lost="denied"
        @interaction="providerState = $event"
        @imported="emit('imported', $event)"
      />
    </template>
    <template v-else>
      <p>{{ t('rankingCatalogPicker.intro') }}</p>
      <button
        v-if="!unresolved"
        type="button"
        class="mm-button"
        :disabled="writing || checking"
        @click="close"
      >
        {{ t('rankingCatalogPicker.close') }}
      </button>
      <form v-if="!unresolved" class="mm-catalog-search" @submit.prevent="search()">
        <label :for="queryId">{{ t('rankingCatalogPicker.query') }}</label>
        <input
          :id="queryId"
          ref="field"
          v-model="query"
          type="search"
          autocomplete="off"
          :disabled="writing"
          :aria-invalid="issue === 'invalid'"
          :aria-describedby="issue ? errorId : undefined"
        />
        <button type="submit" class="mm-button mm-button-primary" :disabled="searching || writing">
          {{ t('rankingCatalogPicker.search') }}
        </button>
      </form>
      <p v-if="searching || writing || checking" role="status">
        {{ t('rankingCatalogPicker.working') }}
      </p>
      <p v-if="issue" :id="errorId" role="alert">{{ t(`rankingCatalogPicker.${issue}`) }}</p>
      <div v-if="unresolved" class="mm-catalog-actions">
        <button type="button" class="mm-button" :disabled="writing || checking" @click="reconcile">
          {{ t('rankingCatalogPicker.check') }}
        </button>
        <button
          v-if="unresolved.reviewed"
          type="button"
          class="mm-button"
          :disabled="writing || checking"
          @click="attach(unresolved.movieId, true)"
        >
          {{ t('rankingCatalogPicker.retrySame') }}
        </button>
      </div>
      <template v-if="requestResult && !unresolved">
        <p v-if="!requestResult.items.length" role="status">
          {{ t('rankingCatalogPicker.empty') }}
        </p>
        <ul v-else class="mm-catalog-results">
          <li v-for="movie in requestResult.items" :key="movie.movie_id">
            <span>
              <strong>{{ movie.title }}</strong>
              <small v-if="movie.release_date"> ({{ movie.release_date.slice(0, 4) }})</small>
            </span>
            <button
              type="button"
              class="mm-button"
              :aria-label="t('rankingCatalogPicker.addNamed', { title: movie.title })"
              :disabled="writing || searching"
              @click="attach(movie.movie_id)"
            >
              {{ t('rankingCatalogPicker.add') }}
            </button>
          </li>
        </ul>
        <div class="mm-catalog-actions">
          <button
            v-if="requestResult.page > 1"
            type="button"
            class="mm-button"
            :disabled="writing || searching"
            @click="search(requestResult.page - 1)"
          >
            {{ t('rankingCatalogPicker.previous') }}
          </button>
          <button
            v-if="requestResult.has_more"
            type="button"
            class="mm-button"
            :disabled="writing || searching"
            @click="search(requestResult.page + 1)"
          >
            {{ t('rankingCatalogPicker.next') }}
          </button>
          <button
            v-if="providerEnabled"
            type="button"
            class="mm-button"
            :disabled="writing || searching"
            @click="provider"
          >
            {{
              t(
                requestResult.items.length
                  ? 'rankingCatalogPicker.noMatchProvider'
                  : 'rankingCatalogPicker.provider',
              )
            }}
          </button>
          <p v-else>{{ t('rankingCatalogPicker.providerDisabled') }}</p>
        </div>
      </template>
      <p v-if="notice" :role="notice === 'added' || notice === 'present' ? 'status' : 'alert'">
        {{ t(`rankingCatalogPicker.${notice}`) }}
      </p>
    </template>
  </section>
</template>
<style scoped>
.mm-catalog-picker {
  min-width: 0;
  overflow-wrap: anywhere;
  margin-block: 16px;
  padding: 16px;
  background: var(--mm-surface);
  border: 1px solid var(--mm-border);
  border-radius: 16px;
}
.mm-catalog-picker h2 {
  margin-top: 0;
}
.mm-catalog-search {
  display: grid;
  gap: 8px;
  margin-block: 12px;
}
.mm-catalog-search input {
  min-width: 0;
  width: 100%;
}
.mm-catalog-search button {
  justify-self: start;
}
.mm-catalog-results {
  padding: 0;
  list-style: none;
}
.mm-catalog-results li {
  border-top: 1px solid var(--mm-border);
  padding-block: 10px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
.mm-catalog-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-block: 8px;
}
</style>
