<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { onBeforeRouteLeave } from 'vue-router';
import BaseConfirmDialog from '~/core/components/BaseConfirmDialog.vue';
import { useUserStore } from '~/core/stores/UserStore';
import BaseContainerMain from '~/core/components/BaseContainerMain.vue';
import BaseSelect from '~/core/components/BaseSelect.vue';
import BaseSkeleton from '~/core/components/BaseSkeleton.vue';
import RankingInvitationInbox from '../components/RankingInvitationInbox.vue';
import RankingService, { validRankingName, type RankingSummary } from '../services/RankingService';
const { t } = useI18n();
const user = useUserStore();
const items = ref<RankingSummary[]>([]);
const cursor = ref<string | null>(null);
const loading = ref(false);
const loadError = ref(false);
const name = ref('');
const visibility = ref('PRIVATE');
const admission = ref('INVITATION');
const creating = ref(false);
const createError = ref('');
const created = ref(false);
const uncertain = ref(false);
const discardDialog = ref<InstanceType<typeof BaseConfirmDialog>>();
let navigationDecision: Promise<boolean> | undefined;
let settleNavigation: ((leave: boolean) => void) | undefined;
function decideNavigation(leave: boolean) {
  settleNavigation?.(leave);
  settleNavigation = undefined;
  navigationDecision = undefined;
}
onBeforeRouteLeave(() => {
  if (!user.user.isLoged || (!name.value.trim() && !creating.value && !uncertain.value))
    return true;
  if (navigationDecision) return navigationDecision;
  navigationDecision = new Promise((resolve) => {
    settleNavigation = resolve;
  });
  void discardDialog.value?.show({
    title: () => t('rankings.leaveTitle'),
    message: () =>
      t(creating.value || uncertain.value ? 'rankings.leavePending' : 'rankings.leaveDraft'),
    ok: () => t('rankings.leave'),
    cancel: () => t('rankings.stay'),
    persistent: false,
  });
  return navigationDecision;
});
let epoch = 0;
let listEpoch = 0;
let controller: AbortController | undefined;
const visibilityOptions = computed(() =>
  ['PRIVATE', 'PUBLIC'].map((value) => ({ value, label: t(`rankings.visibility.${value}`) })),
);
// Requests for admission are gated until their lifecycle is ready. Keep reading old APPROVAL records.
const creatableAdmissions = ['INVITATION', 'OPEN'] as const;
function isCreatableAdmission(value: string): value is (typeof creatableAdmissions)[number] {
  return creatableAdmissions.some((admission) => admission === value);
}
const admissionOptions = computed(() =>
  creatableAdmissions.map((value) => ({
    value,
    label: t(`rankings.admission.${value}`),
  })),
);
async function load(more = false, replace = false, createdRanking?: RankingSummary) {
  if (!user.user.isLoged || (loading.value && !replace)) return;
  const started = epoch;
  const request = ++listEpoch;
  const after = more ? cursor.value || undefined : undefined;
  controller?.abort();
  controller = new AbortController();
  loading.value = true;
  loadError.value = false;
  try {
    const page = await RankingService.list(after, controller.signal);
    if (started !== epoch || request !== listEpoch) return;
    const previous = more ? items.value : createdRanking ? [createdRanking] : [];
    items.value = [
      ...new Map([...previous, ...page.items].map((item) => [item.ranking_id, item])).values(),
    ];
    // A repeated cursor must not create an infinite pagination loop.
    cursor.value = more && page.next_cursor === after ? null : page.next_cursor;
  } catch {
    if (started === epoch && request === listEpoch) loadError.value = true;
  } finally {
    if (started === epoch && request === listEpoch) loading.value = false;
  }
}
function refreshAfterJoin() {
  if (!user.user.isLoged) return;
  items.value = [];
  cursor.value = null;
  void load(false, true);
}
watch(
  [() => user.user.generation, () => user.user.isLoged],
  () => {
    epoch++;
    controller?.abort();
    items.value = [];
    cursor.value = null;
    loading.value = false;
    loadError.value = false;
    name.value = '';
    createError.value = '';
    created.value = false;
    uncertain.value = false;
    creating.value = false;
    if (user.user.isLoged) void load();
  },
  { immediate: true, flush: 'sync' },
);
onBeforeUnmount(() => {
  epoch++;
  controller?.abort();
  decideNavigation(false);
});
async function create() {
  if (creating.value || uncertain.value) return;
  created.value = false;
  createError.value = '';
  if (!validRankingName(name.value)) {
    createError.value = 'invalidName';
    return;
  }
  const selectedAdmission = admission.value;
  if (!isCreatableAdmission(selectedAdmission)) {
    createError.value = 'admissionUnavailable';
    return;
  }
  const started = epoch;
  creating.value = true;
  try {
    const ranking = await RankingService.create({
      name: name.value,
      visibility: visibility.value as RankingSummary['visibility'],
      admission: selectedAdmission,
    });
    if (started !== epoch) return;
    const refreshInFlight = loading.value;
    listEpoch++;
    controller?.abort();
    loading.value = false;
    loadError.value = false;
    items.value = [
      ranking,
      ...items.value.filter((item) => item.ranking_id !== ranking.ranking_id),
    ];
    creating.value = false;
    created.value = true;
    name.value = '';
    if (refreshInFlight) {
      cursor.value = null;
      void load(false, true, ranking);
    }
  } catch (error) {
    if (started !== epoch) return;
    const response = (
      error as { response?: { status?: number; data?: { data?: { code?: string } } } }
    ).response;
    const status = response?.status;
    const code = response?.data?.data?.code;
    createError.value =
      code === 'ranking.invalid_creation' && status === 400
        ? 'invalidName'
        : code === 'ranking.creation_limit_reached' && status === 409
          ? 'limitReached'
          : code === 'ranking.creation_unavailable' && status === 503
            ? 'unavailable'
            : status === 403
              ? 'denied'
              : status === 401
                ? 'sessionExpired'
                : 'uncertain';
    uncertain.value = createError.value === 'uncertain';
  } finally {
    if (started === epoch) creating.value = false;
  }
}
</script>
<template>
  <BaseContainerMain>
    <BaseConfirmDialog
      ref="discardDialog"
      @ok="decideNavigation(true)"
      @cancel="decideNavigation(false)"
    />
    <header class="mm-ranking-heading">
      <div>
        <p class="mm-ranking-eyebrow">MovieMux</p>
        <h1>{{ t('rankings.title') }}</h1>
        <p>{{ t('rankings.subtitle') }}</p>
      </div>
    </header>
    <div class="mm-ranking-columns">
      <section
        class="mm-ranking-list"
        :aria-label="t('rankings.yourRankings')"
        :aria-busy="loading"
      >
        <h2>{{ t('rankings.yourRankings') }}</h2>
        <div v-if="loading && !items.length" role="status">
          <p>{{ t('rankings.loading') }}</p>
          <BaseSkeleton
            v-for="n in 3"
            :key="n"
            shape="block"
            height="110px"
            class="mm-ranking-loading"
          />
        </div>
        <div v-if="loadError" role="alert">
          <p>{{ t('rankings.loadError') }}</p>
          <button class="mm-button" :disabled="loading" @click="load(Boolean(items.length))">
            {{ t('rankings.retry') }}
          </button>
        </div>
        <p v-else-if="!loading && !items.length" class="mm-ranking-empty">
          {{ t('rankings.empty') }}
        </p>
        <ul>
          <li v-for="ranking in items" :key="ranking.ranking_id" class="mm-ranking-card">
            <NuxtLink :to="`/movies/collections/${ranking.ranking_id}`" class="mm-ranking-name">{{
              ranking.name || t('rankings.unnamed')
            }}</NuxtLink>
            <div class="mm-ranking-tags">
              <span>{{ t(`rankings.visibility.${ranking.visibility}`) }}</span
              ><span>{{ t(`rankings.admission.${ranking.admission}`) }}</span>
            </div>
          </li>
        </ul>
        <button v-if="cursor" class="mm-button" :disabled="loading" @click="load(true)">
          {{ loading ? t('rankings.loading') : t('rankings.more') }}
        </button>
      </section>
      <div class="mm-ranking-side">
        <RankingInvitationInbox v-if="user.user.isLoged" @joined="refreshAfterJoin" />
        <section class="mm-ranking-create" :aria-labelledby="'ranking-create-title'">
          <h2 id="ranking-create-title">{{ t('rankings.create') }}</h2>
          <p>{{ t('rankings.createHint') }}</p>
          <form @submit.prevent="create">
            <label for="ranking-name">{{ t('rankings.name') }}</label>
            <input
              id="ranking-name"
              v-model="name"
              class="mm-input"
              autocomplete="off"
              :disabled="creating || uncertain"
              :aria-invalid="createError === 'invalidName'"
              :aria-describedby="createError ? 'ranking-create-error' : undefined"
            />
            <BaseSelect
              v-model="visibility"
              :label="t('rankings.visibilityLabel')"
              :options="visibilityOptions"
              :disabled="creating || uncertain"
            />
            <BaseSelect
              v-model="admission"
              :label="t('rankings.admissionLabel')"
              :options="admissionOptions"
              :disabled="creating || uncertain"
            />
            <p class="mm-ranking-hint">{{ t('rankings.visibilityHint') }}</p>
            <p v-if="createError" id="ranking-create-error" role="alert">
              {{ t(`rankings.errors.${createError}`) }}
            </p>
            <p v-if="created" role="status">{{ t('rankings.created') }}</p>
            <button
              class="mm-button mm-button-primary"
              :disabled="creating || uncertain"
              type="submit"
            >
              {{ creating ? t('rankings.creating') : t('rankings.create') }}
            </button>
            <button
              v-if="uncertain"
              type="button"
              class="mm-button"
              :disabled="loading"
              @click="load()"
            >
              {{ t('rankings.checkList') }}
            </button>
          </form>
        </section>
      </div>
    </div>
  </BaseContainerMain>
</template>
<style scoped>
.mm-ranking-loading {
  margin-bottom: 12px;
}
.mm-ranking-heading {
  margin-bottom: 28px;
}
.mm-ranking-heading h1 {
  margin: 4px 0 10px;
}
.mm-ranking-eyebrow {
  color: var(--mm-muted);
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.75rem;
}
.mm-ranking-columns {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}
.mm-ranking-side {
  display: grid;
  gap: 16px;
  min-width: 0;
}
.mm-ranking-list,
.mm-ranking-create {
  min-width: 0;
}
.mm-ranking-create {
  padding: 24px;
  border: 1px solid var(--mm-border);
  border-radius: 20px;
  background: var(--mm-surface);
}
.mm-ranking-create form {
  display: grid;
  gap: 14px;
}
.mm-ranking-create h2,
.mm-ranking-list h2 {
  margin-top: 0;
}
.mm-ranking-create p {
  line-height: 1.6;
}
.mm-ranking-list ul {
  list-style: none;
  padding: 0;
  margin: 16px 0;
  display: grid;
  gap: 12px;
}
.mm-ranking-card {
  padding: 22px;
  border: 1px solid var(--mm-border);
  border-radius: 16px;
  background: var(--mm-surface);
}
.mm-ranking-name {
  display: inline-block;
  font-size: 1.15rem;
  font-weight: 700;
  overflow-wrap: anywhere;
  color: var(--mm-text);
}
.mm-ranking-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}
.mm-ranking-tags span {
  padding: 5px 10px;
  border: 1px solid var(--mm-border);
  border-radius: 20px;
  font-size: 0.8rem;
}
.mm-ranking-hint,
.mm-ranking-empty {
  color: var(--mm-muted);
}
.mm-input {
  width: 100%;
  min-width: 0;
  padding: 12px;
  background: var(--mm-surface);
  color: var(--mm-text);
  border: 1px solid var(--mm-border);
  border-radius: 10px;
}
@media (max-width: 1000px) {
  .mm-ranking-columns {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
