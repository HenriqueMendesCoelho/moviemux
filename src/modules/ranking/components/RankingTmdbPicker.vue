<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRuntimeConfig } from '#imports';
import { useUserStore } from '~/core/stores/UserStore';
import BaseSkeleton from '~/core/components/BaseSkeleton.vue';
import { tmdbImageUrl } from '~/modules/movie/utils/MovieStateUtils';
import catalog from '../services/RankingCatalogService';
import picker, {
  isTmdbPickerPoster,
  pickerQuery,
  type ImportReceipt,
  type PickerLanguage,
  type PickerPage,
} from '../services/RankingTmdbPickerService';

const props = withDefaults(
  defineProps<{ rankingId: string; canAdd: boolean; enabled?: boolean }>(),
  { enabled: false },
);
const emit = defineEmits<{
  imported: [result: ImportReceipt & { rankingId: string }];
  scopeLost: [status: number];
  interaction: [state: 'idle' | 'draft' | 'pending' | 'uncertain'];
}>();
const user = useUserStore(),
  { t, locale } = useI18n();
const imageBase = String(useRuntimeConfig().public.tmdbImageBase || '').replace(/\/+$/, '');
const titleId = useId(),
  queryId = useId(),
  errorId = useId();
const panel = ref(false),
  query = ref(''),
  searching = ref(false),
  writing = ref(false),
  checking = ref(false);
const result = ref<PickerPage | null>(null),
  feedback = ref(''),
  issue = ref('');
const unresolved = ref<{ tmdbId: number; ready: boolean } | null>(null);
const scopeBlocked = ref(false);
const opener = ref<HTMLButtonElement>(),
  field = ref<HTMLInputElement>();
const failed = ref(new Set<string>());
let scopeEpoch = 0,
  searchEpoch = 0;
let searchController: AbortController | undefined, reconcileController: AbortController | undefined;
const allowed = computed(
  () => props.enabled && props.canAdd && user.user.isLoged && !scopeBlocked.value,
);
const language = computed<PickerLanguage>(() => (locale.value === 'pt-BR' ? 'pt-BR' : 'en-US'));
watch(
  () =>
    writing.value
      ? 'pending'
      : unresolved.value
        ? 'uncertain'
        : panel.value && query.value
          ? 'draft'
          : 'idle',
  (state) => emit('interaction', state),
  { flush: 'sync' },
);
function clearSearch() {
  searchEpoch++;
  searchController?.abort();
  searching.value = false;
  result.value = null;
  issue.value = '';
  failed.value.clear();
}
function reset() {
  scopeEpoch++;
  clearSearch();
  reconcileController?.abort();
  panel.value = false;
  query.value = '';
  writing.value = false;
  checking.value = false;
  unresolved.value = null;
  scopeBlocked.value = false;
  feedback.value = '';
}
watch(
  [
    () => props.rankingId,
    () => props.canAdd,
    () => props.enabled,
    () => user.user.generation,
    () => user.user.isLoged,
  ],
  reset,
  { flush: 'sync' },
);
watch(query, clearSearch, { flush: 'sync' });
watch(language, clearSearch, { flush: 'sync' });
onBeforeUnmount(reset);

async function show() {
  if (!allowed.value || writing.value) return;
  panel.value = true;
  feedback.value = unresolved.value ? 'uncertain' : '';
  await nextTick();
  field.value?.focus();
}
async function hide() {
  if (writing.value) return;
  panel.value = false;
  query.value = '';
  clearSearch();
  feedback.value = '';
  reconcileController?.abort();
  checking.value = false;
  if (unresolved.value) unresolved.value = { ...unresolved.value, ready: false };
  await nextTick();
  opener.value?.focus();
}
function classify(e: unknown, operation: 'search' | 'add') {
  const r = (e as { response?: { status?: number; data?: { data?: { code?: string } } } })
    ?.response;
  const status = r?.status,
    code = r?.data?.data?.code;
  if (status === 401 || status === 403 || (status === 404 && code === 'ranking.not_found'))
    return { label: 'unavailable', denied: status };
  if (status === 429) return { label: 'retryLater' };
  if (
    status === 400 &&
    code === (operation === 'search' ? 'ranking.invalid_tmdb_search' : 'ranking.invalid_tmdb_id')
  )
    return { label: 'invalid' };
  if (status === 409 && code === 'ranking.archived_read_only')
    return { label: 'archived', denied: status };
  if (status === 503 && code === 'ranking.tmdb_import_unavailable') return { label: 'disabled' };
  if (
    (status === 503 && code === 'ranking.tmdb_unavailable') ||
    (status === 502 && code === 'ranking.tmdb_invalid_response')
  )
    return { label: 'providerError' };
  if (operation === 'add' && status === 404 && code === 'ranking.tmdb_not_found')
    return { label: 'movieUnavailable' };
  if (operation === 'add' && status === 409 && code === 'ranking.entry_recovery_expired')
    return { label: 'expired' };
  if (operation === 'add' && status === 409 && code === 'ranking.catalog_identity_conflict')
    return { label: 'conflict' };
  return { label: operation === 'search' ? 'searchError' : 'uncertain' };
}
function scopeDenied(status: number, label = 'unavailable') {
  reset();
  scopeBlocked.value = true;
  feedback.value = label;
  emit('scopeLost', status);
}
async function search(page = 1) {
  if (
    !panel.value ||
    !allowed.value ||
    writing.value ||
    checking.value ||
    unresolved.value ||
    searching.value
  )
    return;
  const text = pickerQuery(query.value);
  if (text === null) {
    issue.value = 'invalid';
    field.value?.focus();
    return;
  }
  const session = scopeEpoch,
    request = ++searchEpoch;
  searchController?.abort();
  searchController = new AbortController();
  issue.value = '';
  feedback.value = '';
  searching.value = true;
  result.value = null;
  try {
    const found = await picker.search(
      props.rankingId,
      text,
      page,
      language.value,
      props.enabled,
      searchController.signal,
    );
    if (session === scopeEpoch && request === searchEpoch) result.value = found;
  } catch (e) {
    if (session !== scopeEpoch || request !== searchEpoch) return;
    const failure = classify(e, 'search');
    if (failure.denied) scopeDenied(failure.denied, failure.label);
    else issue.value = failure.label;
  } finally {
    if (session === scopeEpoch && request === searchEpoch) searching.value = false;
  }
}
async function importMovie(tmdbId: number, retry = false) {
  if (!panel.value || !allowed.value || searching.value || writing.value || checking.value) return;
  if (
    retry
      ? !unresolved.value?.ready || unresolved.value.tmdbId !== tmdbId
      : unresolved.value || !result.value?.items.some((movie) => movie.tmdb_id === tmdbId)
  )
    return;
  const session = scopeEpoch,
    rankingId = props.rankingId;
  writing.value = true;
  if (retry) unresolved.value = { tmdbId, ready: false };
  feedback.value = '';
  try {
    const receipt = await picker.add(rankingId, tmdbId, props.enabled);
    if (session !== scopeEpoch) return;
    unresolved.value = null;
    feedback.value = receipt.disposition === 'new' ? 'added' : 'present';
    emit('imported', { rankingId, ...receipt });
  } catch (e) {
    if (session !== scopeEpoch) return;
    const failure = classify(e, 'add');
    if (failure.denied) scopeDenied(failure.denied, failure.label);
    else {
      feedback.value = failure.label;
      if (failure.label === 'uncertain') {
        unresolved.value = { tmdbId, ready: false };
        query.value = '';
        clearSearch();
      }
    }
  } finally {
    if (session === scopeEpoch) writing.value = false;
  }
}
async function reconcile() {
  const target = unresolved.value;
  if (!target || !allowed.value || !panel.value || writing.value || checking.value) return;
  const session = scopeEpoch,
    rankingId = props.rankingId;
  const request = new AbortController();
  reconcileController = request;
  checking.value = true;
  feedback.value = '';
  try {
    const summary = await catalog.summary(rankingId, request.signal);
    if (session !== scopeEpoch || request.signal.aborted) return;
    if (!summary.capabilities.includes('READ') || !summary.capabilities.includes('ADD_ENTRY')) {
      scopeDenied(403);
      return;
    }
    const page = await catalog.entries(rankingId, undefined, request.signal);
    if (session !== scopeEpoch || request.signal.aborted) return;
    const match = page.items.find((entry) => entry.tmdb_id === target.tmdbId);
    if (match) {
      unresolved.value = null;
      feedback.value = 'present';
      emit('imported', { rankingId, entryId: match.entry_id, disposition: 'verified' });
    } else {
      // A single authorized page cannot prove absence. A further invocation is explicit
      // and uses the same backend-idempotent canonical TMDB target.
      unresolved.value = { ...target, ready: true };
      feedback.value = 'unconfirmedAfterCheck';
    }
  } catch (e) {
    if (session !== scopeEpoch || request.signal.aborted) return;
    const status = (e as { response?: { status?: number } })?.response?.status;
    if (status === 401 || status === 403 || status === 404) scopeDenied(status);
    else feedback.value = 'recheckError';
  } finally {
    if (session === scopeEpoch && !request.signal.aborted) checking.value = false;
  }
}
function poster(path: string | null) {
  return isTmdbPickerPoster(path) && /^https?:\/\/[^/?#]+(?:\/[^?#]*)?$/i.test(imageBase)
    ? tmdbImageUrl(imageBase, path, 'w185')
    : '';
}
</script>
<template>
  <section
    v-if="canAdd && user.user.isLoged"
    class="mm-tmdb-picker"
    :aria-labelledby="titleId"
    :aria-busy="searching || writing || checking"
  >
    <h2 :id="titleId">{{ t('rankingTmdbPicker.title') }}</h2>
    <p v-if="!enabled">{{ t('rankingTmdbPicker.disabled') }}</p>
    <button
      v-else-if="!panel && !scopeBlocked"
      ref="opener"
      class="mm-button"
      type="button"
      @click="show"
    >
      {{ t('rankingTmdbPicker.open') }}
    </button>
    <template v-else-if="panel">
      <button class="mm-button" type="button" :disabled="writing" @click="hide">
        {{ t('rankingTmdbPicker.close') }}
      </button>
      <form
        v-if="!unresolved"
        class="mm-tmdb-search"
        @submit.prevent="search()"
        @keydown.esc.prevent.stop="hide"
      >
        <label :for="queryId">{{ t('rankingTmdbPicker.query') }}</label>
        <input
          :id="queryId"
          ref="field"
          v-model="query"
          class="mm-tmdb-input"
          type="search"
          autocomplete="off"
          spellcheck="false"
          :disabled="writing"
          :aria-invalid="issue === 'invalid'"
          :aria-describedby="issue === 'invalid' ? errorId : undefined"
        />
        <button class="mm-button mm-button-primary" type="submit" :disabled="searching || writing">
          {{ t('rankingTmdbPicker.search') }}
        </button>
      </form>
      <div v-else class="mm-tmdb-actions">
        <button class="mm-button" type="button" :disabled="writing || checking" @click="reconcile">
          {{ t('rankingTmdbPicker.check') }}
        </button>
        <button
          v-if="unresolved.ready"
          class="mm-button"
          type="button"
          :disabled="writing || checking"
          @click="importMovie(unresolved.tmdbId, true)"
        >
          {{ t('rankingTmdbPicker.retryImport') }}
        </button>
      </div>
      <div v-if="searching || writing || checking" role="status">
        {{ t('rankingTmdbPicker.working') }}
        <BaseSkeleton v-if="searching" shape="block" height="68px" />
      </div>
      <p v-if="issue" :id="errorId" role="alert">{{ t(`rankingTmdbPicker.${issue}`) }}</p>
      <template v-if="result && !unresolved">
        <p v-if="!result.items.length" role="status">{{ t('rankingTmdbPicker.empty') }}</p>
        <ul v-else class="mm-tmdb-results">
          <li v-for="movie in result.items" :key="movie.tmdb_id">
            <span class="mm-tmdb-poster" aria-hidden="true">
              <img
                v-if="poster(movie.poster_path) && !failed.has(movie.poster_path || '')"
                :src="poster(movie.poster_path)"
                width="42"
                height="63"
                loading="lazy"
                decoding="async"
                referrerpolicy="no-referrer"
                alt=""
                @error="failed.add(movie.poster_path || '')"
              />
              <span v-else>🎬</span>
            </span>
            <span class="mm-tmdb-label">
              <strong>{{ movie.title }}</strong>
              <small v-if="movie.original_title && movie.original_title !== movie.title">{{
                movie.original_title
              }}</small>
              <small v-if="movie.release_date">{{ movie.release_date.slice(0, 4) }}</small>
            </span>
            <button
              class="mm-button"
              type="button"
              :aria-label="t('rankingTmdbPicker.addNamed', { title: movie.title })"
              :disabled="writing"
              @click="importMovie(movie.tmdb_id)"
            >
              {{ t('rankingTmdbPicker.add') }}
            </button>
          </li>
        </ul>
        <div class="mm-tmdb-actions">
          <button
            v-if="result.page > 1"
            class="mm-button"
            type="button"
            :disabled="writing"
            @click="search(result.page - 1)"
          >
            {{ t('rankingTmdbPicker.previous') }}
          </button>
          <button
            v-if="result.has_more"
            class="mm-button"
            type="button"
            :disabled="writing"
            @click="search(result.page + 1)"
          >
            {{ t('rankingTmdbPicker.next') }}
          </button>
        </div>
      </template>
    </template>
    <p v-if="feedback" :role="feedback === 'added' || feedback === 'present' ? 'status' : 'alert'">
      {{ t(`rankingTmdbPicker.${feedback}`) }}
    </p>
  </section>
</template>
<style scoped>
.mm-tmdb-picker {
  min-width: 0;
  border: 1px solid var(--mm-border);
  background: var(--mm-surface);
  border-radius: 16px;
  padding: 16px;
  overflow-wrap: anywhere;
}
.mm-tmdb-picker h2 {
  margin-top: 0;
}
.mm-tmdb-search {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin: 12px 0;
}
.mm-tmdb-search label {
  flex-basis: 100%;
}
.mm-tmdb-input {
  min-width: 0;
  flex: 1 1 14ch;
  min-height: 44px;
  padding: 8px 12px;
  border: 1px solid var(--mm-border);
  border-radius: 10px;
  background: var(--mm-surface);
  color: var(--mm-text);
}
.mm-tmdb-input:focus-visible {
  outline: 2px solid #00f6ff;
  outline-offset: 2px;
}
.mm-tmdb-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin: 8px 0;
}
.mm-tmdb-results {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 8px;
}
.mm-tmdb-results li {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
}
.mm-tmdb-label {
  min-width: 0;
  overflow-wrap: anywhere;
  display: grid;
  gap: 2px;
}
.mm-tmdb-label small {
  color: var(--mm-muted);
}
.mm-tmdb-poster {
  width: 42px;
  height: 63px;
  display: grid;
  place-items: center;
  background: var(--mm-raised);
  overflow: hidden;
  border-radius: 6px;
}
.mm-tmdb-poster img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
@media (max-width: 420px) {
  .mm-tmdb-results li {
    grid-template-columns: 42px minmax(0, 1fr);
  }
  .mm-tmdb-results li button {
    grid-column: 2;
    justify-self: start;
  }
}
</style>
