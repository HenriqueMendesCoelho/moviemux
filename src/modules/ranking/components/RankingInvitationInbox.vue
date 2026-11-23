<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useUserStore } from '~/core/stores/UserStore';
import inbox, { type IncomingInvitation } from '../services/RankingInvitationInboxService';
import catalog from '../services/RankingCatalogService';
import type { RankingSummary } from '../services/RankingService';

const { t, locale } = useI18n();
const user = useUserStore();
const titleId = useId();
const emit = defineEmits<{ joined: [summary: RankingSummary] }>();
const items = ref<IncomingInvitation[]>([]);
const nextCursor = ref<string | null>(null);
const reading = ref(false);
const accepting = ref(false);
const loadError = ref(false);
const loaded = ref(false);
const feedback = ref('');
const plan = ref<{ rankingId: string; confirmed: boolean } | null>(null);
const joined = ref<RankingSummary | null>(null);
let listRequest: AbortController | undefined;
let summaryRequest: AbortController | undefined;
let active = false,
  epoch = 0,
  listEpoch = 0;
function reset() {
  epoch++;
  listEpoch++;
  listRequest?.abort();
  summaryRequest?.abort();
  items.value = [];
  nextCursor.value = null;
  reading.value = false;
  accepting.value = false;
  loaded.value = false;
  loadError.value = false;
  plan.value = null;
  joined.value = null;
  feedback.value = '';
}
function statusOf(e: unknown) {
  return (e as { response?: { status?: number } })?.response?.status;
}
function expiry(raw: string) {
  return new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(raw),
  );
}
async function load(more = false, force = false) {
  if (!active || !user.user.isLoged || (!force && reading.value)) return;
  const started = epoch,
    request = ++listEpoch,
    cursor = more ? nextCursor.value || undefined : undefined;
  listRequest?.abort();
  listRequest = new AbortController();
  reading.value = true;
  loadError.value = false;
  if (!more) {
    items.value = [];
    nextCursor.value = null;
  }
  try {
    const page = await inbox.incoming(cursor, listRequest.signal);
    if (started !== epoch || request !== listEpoch) return;
    items.value = [
      ...new Map([...items.value, ...page.items].map((item) => [item.invite_id, item])).values(),
    ];
    nextCursor.value = page.next_cursor === cursor ? null : page.next_cursor;
    loaded.value = true;
  } catch (e) {
    if (started !== epoch || request !== listEpoch) return;
    if ([401, 403, 404].includes(statusOf(e) || 0)) {
      items.value = [];
      nextCursor.value = null;
    }
    loadError.value = true;
  } finally {
    if (started === epoch && request === listEpoch) reading.value = false;
  }
}
watch(
  () => [user.user.generation, user.user.isLoged],
  () => {
    reset();
    void load();
  },
  { flush: 'sync' },
);
onMounted(() => {
  active = true;
  void load();
});
onBeforeUnmount(() => {
  active = false;
  reset();
});
function evict() {
  listEpoch++;
  listRequest?.abort();
  items.value = [];
  nextCursor.value = null;
  reading.value = false;
  loaded.value = false;
  loadError.value = false;
}
async function checkAccess(started: number) {
  const current = plan.value;
  if (!current || started !== epoch) return;
  summaryRequest?.abort();
  summaryRequest = new AbortController();
  try {
    const summary = await catalog.summary(current.rankingId, summaryRequest.signal);
    if (!summary.capabilities.includes('READ')) throw new Error('Unconfirmed ranking access');
    if (started !== epoch) return;
    joined.value = summary;
    plan.value = null;
    feedback.value = '';
    emit('joined', summary);
    void load(false, true);
  } catch {
    if (started === epoch)
      feedback.value = current.confirmed ? 'accessUnconfirmed' : 'acceptUnconfirmed';
  }
}
async function accept(item: IncomingInvitation) {
  if (
    !active ||
    !user.user.isLoged ||
    accepting.value ||
    plan.value ||
    !items.value.some((i) => i.invite_id === item.invite_id)
  )
    return;
  const started = epoch;
  accepting.value = true;
  feedback.value = '';
  joined.value = null;
  evict();
  try {
    await inbox.accept(item);
  } catch (e) {
    if (started !== epoch) return;
    const status = statusOf(e);
    if (status === 401 || status === 403 || status === 404) {
      feedback.value = 'inviteUnavailable';
      accepting.value = false;
      void load(false, true);
      return;
    }
    plan.value = { rankingId: item.ranking_id, confirmed: false };
    feedback.value = 'acceptUnconfirmed';
    accepting.value = false;
    return;
  }
  if (started !== epoch) return;
  plan.value = { rankingId: item.ranking_id, confirmed: true };
  await checkAccess(started);
  if (started === epoch) accepting.value = false;
}
async function recheck() {
  if (accepting.value || !plan.value) return;
  const started = epoch;
  accepting.value = true;
  feedback.value = '';
  try {
    await checkAccess(started);
  } finally {
    if (started === epoch) accepting.value = false;
  }
}
function reviewInbox() {
  if (accepting.value) return;
  plan.value = null;
  feedback.value = '';
  void load(false, true);
}
</script>
<template>
  <section
    v-if="user.user.isLoged"
    class="mm-invitation-inbox"
    :aria-labelledby="titleId"
    :aria-busy="reading || accepting"
  >
    <h2 :id="titleId">{{ t('rankingInvitationInbox.title') }}</h2>
    <p v-if="reading || accepting" role="status">{{ t('rankingInvitationInbox.loading') }}</p>
    <p v-if="feedback" role="alert">{{ t(`rankingInvitationInbox.${feedback}`) }}</p>
    <div v-if="plan && !accepting" class="mm-inbox-actions">
      <button type="button" class="mm-button" @click="recheck">
        {{ t('rankingInvitationInbox.checkAccess') }}
      </button>
      <button type="button" class="mm-button" @click="reviewInbox">
        {{ t('rankingInvitationInbox.reviewInbox') }}
      </button>
    </div>
    <div v-if="joined" role="status">
      <p>
        {{
          t('rankingInvitationInbox.ready', {
            name: joined.name ?? t('rankingInvitationInbox.unnamed'),
          })
        }}
      </p>
      <NuxtLink :to="`/rankings/${joined.ranking_id}`" no-prefetch class="mm-button">{{
        t('rankingInvitationInbox.open')
      }}</NuxtLink>
    </div>
    <div v-if="loadError" role="alert">
      <p>{{ t('rankingInvitationInbox.loadError') }}</p>
      <button type="button" class="mm-button" @click="load(Boolean(nextCursor))">
        {{ t('rankingInvitationInbox.retry') }}
      </button>
    </div>
    <p v-else-if="loaded && !reading && !items.length">{{ t('rankingInvitationInbox.empty') }}</p>
    <ul v-if="items.length" class="mm-inbox-list">
      <li v-for="item in items" :key="item.invite_id">
        <h3>{{ item.ranking_name ?? t('rankingInvitationInbox.unnamed') }}</h3>
        <p>
          {{ t('rankingInvitationInbox.expires') }}
          <time :datetime="item.expires_at">{{ expiry(item.expires_at) }}</time>
        </p>
        <button
          type="button"
          class="mm-button mm-button-primary"
          :disabled="accepting || Boolean(plan)"
          @click="accept(item)"
        >
          {{ t('rankingInvitationInbox.accept') }}
        </button>
      </li>
    </ul>
    <button
      v-if="nextCursor && !loadError"
      type="button"
      class="mm-button"
      :disabled="reading || accepting"
      @click="load(true)"
    >
      {{ t('rankingInvitationInbox.more') }}
    </button>
  </section>
</template>
<style scoped>
.mm-invitation-inbox {
  min-width: 0;
  border: 1px solid var(--mm-border);
  border-radius: 16px;
  background: var(--mm-surface);
  padding: 16px;
  overflow-wrap: anywhere;
}
.mm-invitation-inbox h2 {
  margin-top: 0;
}
.mm-inbox-list {
  padding: 0;
  list-style: none;
  display: grid;
  gap: 12px;
}
.mm-inbox-list li {
  border-top: 1px solid var(--mm-border);
  padding-top: 12px;
}
.mm-inbox-list h3 {
  margin: 0;
}
.mm-inbox-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
