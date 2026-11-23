<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import BaseSkeleton from '~/core/components/BaseSkeleton.vue';
import LanguageSelector from '~/core/i18n/LanguageSelector.vue';
import service, {
  PublicCollectionError,
  publicCollectionId,
  type PublicCollectionEntry,
  type PublicCollectionSummary,
} from '../services/PublicCollectionService';
import { formatRatingMean } from '../utils/formatRatingMean';

const props = defineProps<{ rankingId: unknown }>();
const { t, locale } = useI18n();
const id = computed(() => publicCollectionId(props.rankingId));
const summary = ref<PublicCollectionSummary | null>(null),
  entries = ref<PublicCollectionEntry[]>([]);
const cursor = ref<string | null>(null),
  working = ref(false);
const feedback = ref('');
let epoch = 0,
  mounted = false;
let controller: AbortController | undefined;

function clear() {
  epoch++;
  controller?.abort();
  summary.value = null;
  entries.value = [];
  cursor.value = null;
  feedback.value = '';
  working.value = false;
}
async function load(more = false) {
  const rank = id.value;
  if (!mounted || working.value) return;
  if (!rank) {
    feedback.value = 'unavailable';
    return;
  }
  const after = more ? cursor.value : null;
  if (more && !after) return;
  const started = epoch;
  const request = new AbortController();
  controller = request;
  feedback.value = '';
  working.value = true;
  try {
    const current = more ? summary.value : await service.summary(rank, request.signal);
    if (started !== epoch) return;
    if (!current || current.ranking_id !== rank) throw new PublicCollectionError(502);
    const page = await service.entries(rank, after, request.signal);
    if (started !== epoch) return;
    summary.value = current;
    entries.value = more ? [...entries.value, ...page.items] : page.items;
    cursor.value = page.next_cursor === after ? null : page.next_cursor;
  } catch (e) {
    if (started !== epoch) return;
    if (e instanceof PublicCollectionError && e.status === 404) {
      clear();
      feedback.value = 'unavailable';
    } else feedback.value = more ? 'moreError' : 'loadError';
  } finally {
    if (started === epoch) working.value = false;
  }
}
function reload() {
  clear();
  void load();
}
function onPageShow(event: PageTransitionEvent) {
  if (event.persisted) reload();
}
watch(id, reload, { flush: 'sync' });
onMounted(() => {
  mounted = true;
  window.addEventListener('pagehide', clear);
  window.addEventListener('pageshow', onPageShow);
  void load();
});
onBeforeUnmount(() => {
  mounted = false;
  window.removeEventListener('pagehide', clear);
  window.removeEventListener('pageshow', onPageShow);
  clear();
});
</script>
<template>
  <main class="mm-public-collection" :aria-busy="working" aria-labelledby="public-collection-title">
    <header class="mm-public-collection-header">
      <div class="mm-public-collection-intro">
        <p class="mm-public-collection-kicker">MovieMux</p>
        <h1 id="public-collection-title">
          {{
            summary
              ? summary.ranking_name || t('publicCollection.unnamed')
              : t('publicCollection.title')
          }}
        </h1>
        <p>{{ t('publicCollection.readOnly') }}</p>
      </div>
      <div class="mm-public-collection-language"><LanguageSelector /></div>
    </header>
    <p v-if="working" role="status">{{ t('publicCollection.loading') }}</p>
    <template v-if="working && !summary">
      <BaseSkeleton v-for="n in 3" :key="n" shape="block" height="62px" />
    </template>
    <div v-if="feedback" class="mm-public-collection-feedback" role="alert">
      <p>{{ t(`publicCollection.${feedback}`) }}</p>
      <button
        v-if="feedback !== 'unavailable'"
        class="mm-button"
        type="button"
        @click="load(Boolean(summary))"
      >
        {{ t('publicCollection.retry') }}
      </button>
    </div>
    <template v-if="summary">
      <h2>{{ t('publicCollection.movies') }}</h2>
      <p v-if="!entries.length">{{ t('publicCollection.empty') }}</p>
      <ul v-else class="mm-public-collection-list">
        <li v-for="entry in entries" :key="entry.entry_id">
          <div>{{ entry.title || t('publicCollection.untitled') }}</div>
          <p v-if="entry.votes > 0n" class="mm-public-collection-mean">
            {{ t('publicCollection.mean') }}:
            <strong>{{ formatRatingMean(entry.total, entry.votes, locale) }}</strong>
            <span class="mm-sr-only">{{
              t('publicCollection.exactRatio', {
                total: entry.total.toString(),
                votes: entry.votes.toString(),
              })
            }}</span>
          </p>
          <p v-else class="mm-public-collection-mean">{{ t('publicCollection.noVotes') }}</p>
        </li>
      </ul>
      <button
        v-if="cursor && feedback !== 'moreError'"
        type="button"
        class="mm-button"
        :disabled="working"
        @click="load(true)"
      >
        {{ t('publicCollection.more') }}
      </button>
    </template>
  </main>
</template>
<style scoped>
.mm-public-collection {
  width: min(100% - 32px, 940px);
  margin: 0 auto;
  padding: clamp(20px, 5vw, 64px) 0;
  overflow-wrap: anywhere;
  min-width: 0;
}
.mm-public-collection-header {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: flex-start;
  margin-bottom: 28px;
}
.mm-public-collection-intro {
  min-width: 0;
}
.mm-public-collection-kicker {
  color: var(--mm-muted);
  margin: 0 0 4px;
  font-size: 0.8rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.mm-public-collection h1 {
  margin: 0;
}
.mm-public-collection-intro > p:last-child,
.mm-public-collection-mean {
  color: var(--mm-muted);
}
.mm-public-collection-language {
  flex: 0 1 240px;
  min-width: 0;
  width: min(100%, 240px);
}
.mm-public-collection-list {
  list-style: none;
  margin: 0 0 18px;
  padding: 0;
  display: grid;
  gap: 10px;
}
.mm-public-collection-list li,
.mm-public-collection-feedback {
  border: 1px solid var(--mm-border);
  border-radius: 14px;
  background: var(--mm-surface);
  padding: 14px 16px;
  min-width: 0;
}
.mm-public-collection-list li div {
  font-weight: 700;
}
.mm-public-collection-list li p {
  margin: 5px 0 0;
}
.mm-public-collection-feedback p {
  margin: 0 0 10px;
}
@media (max-width: 580px) {
  .mm-public-collection-header {
    flex-direction: column-reverse;
  }
  .mm-public-collection-language {
    flex-basis: auto;
    align-self: flex-end;
  }
}
</style>
