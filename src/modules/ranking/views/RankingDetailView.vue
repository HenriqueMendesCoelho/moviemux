<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router';
import { useRuntimeConfig } from '#imports';
import { useI18n } from 'vue-i18n';
import { useUserStore } from '~/core/stores/UserStore';
import BaseContainerMain from '~/core/components/BaseContainerMain.vue';
import RankingEntryRecovery from '../components/RankingEntryRecovery.vue';
import RankingEntryCard from '../components/RankingEntryCard.vue';
import { rankingIdPattern } from '../services/RankingService';
import RankingInvitationIssuer from '../components/RankingInvitationIssuer.vue';
import RankingTmdbPicker from '../components/RankingTmdbPicker.vue';
import type { ImportReceipt } from '../services/RankingTmdbPickerService';
import RankingVisibilitySettings from '../components/RankingVisibilitySettings.vue';
import RankingRepeatedRoundsSettings from '../components/RankingRepeatedRoundsSettings.vue';
import RankingNewRoundForm from '../components/RankingNewRoundForm.vue';
import type { CreatedRound, RoundCreationIntent } from '../services/RankingRepeatedRoundService';
import RankingRoundPanel from '../components/RankingRoundPanel.vue';
import BaseConfirmDialog from '~/core/components/BaseConfirmDialog.vue';
import { formatRatingMean } from '../utils/formatRatingMean';
import type { RoundScope } from '../services/RankingRoundService';
import catalog, {
  entryTitle,
  type RankingEntry,
  type RankingRound,
  type RatingAggregate,
} from '../services/RankingCatalogService';
const props = defineProps<{ rankingId: string }>();
const { t, locale } = useI18n();
const user = useUserStore();
const config = useRuntimeConfig();
const pickerEnabled = computed(() => String(config.public.rankingTmdbPickerEnabled) === 'true');
const copyEnabled = computed(() => String(config.public.rankingRatingCopyEnabled) === 'true');
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
const approvalAdmission = ref(false);
const recoveryGrant = ref('');
const recoveryState = ref<'idle' | 'draft' | 'pending'>('idle');
const canInvite = ref(false);
const canShareOpenLink = ref(false);
const copyingOpenLink = ref(false);
const openLinkNotice = ref('');
function resetOpenLink() {
  canShareOpenLink.value = false;
  copyingOpenLink.value = false;
  openLinkNotice.value = '';
}
async function copyOpenLink() {
  const id = props.rankingId;
  if (
    !canShareOpenLink.value ||
    !user.user.isLoged ||
    loading.value ||
    copyingOpenLink.value ||
    !rankingIdPattern.test(id)
  )
    return;
  const started = epoch;
  copyingOpenLink.value = true;
  openLinkNotice.value = '';
  try {
    const url = new URL(`/movies/collections/${id.toLowerCase()}/join`, window.location.origin);
    await navigator.clipboard.writeText(url.href);
    if (started === epoch && canShareOpenLink.value) openLinkNotice.value = 'openLinkCopied';
  } catch {
    if (started === epoch && canShareOpenLink.value) openLinkNotice.value = 'openLinkCopyError';
  } finally {
    if (started === epoch) copyingOpenLink.value = false;
  }
}
const canAdd = ref(false);
const pickerEpoch = ref(0);
const pickerNotice = ref('');
const pickerInteraction = ref<'idle' | 'draft' | 'pending' | 'uncertain'>('idle');
const invitationUnavailable = ref(false);
const rankingName = ref<string | null | undefined>(undefined);
const uncertain = ref(new Set<string>());
type RepeatInteraction = 'idle' | 'draft' | 'pending' | 'uncertain';
const repeatSettings = ref<boolean | null>(null);
const repeatSettingsState = ref<RepeatInteraction>('idle');
const visibilityState = ref<RepeatInteraction>('idle');
const newRoundState = ref<RepeatInteraction>('idle');
const repeatPolicyRevision = ref(0);
const repeatIntents = ref(new Map<string, RoundCreationIntent>());
const repeatIntent = computed<RoundCreationIntent | null>({
  get: () => (selected.value ? (repeatIntents.value.get(selected.value.entry_id) ?? null) : null),
  set: (intent) => {
    const entry = selected.value?.entry_id;
    if (!entry) return;
    if (intent) repeatIntents.value.set(entry, intent);
    else repeatIntents.value.delete(entry);
  },
});
const hasRepeatRequest = () =>
  repeatSettingsState.value === 'pending' || newRoundState.value === 'pending';
function clearRepeatOwner() {
  repeatSettings.value = null;
  repeatSettingsState.value = 'idle';
  newRoundState.value = 'idle';
  repeatIntents.value.clear();
}
function rememberRepeatSettings(value: boolean | null) {
  repeatSettings.value = value;
}
function confirmedRepeatedRound(result: CreatedRound & { rankingId: string; entryId: string }) {
  if (result.rankingId !== props.rankingId || result.entryId !== selected.value?.entry_id) return;
  void open(selected.value, false, true);
}
function lostRepeatOwner(status: number) {
  clearRepeatOwner();
  if (status === 401) {
    invalidateScope();
    error.value = 'sessionExpired';
    return;
  }
  // Ownership may change without revoking READ. Revalidate canonical access on denial.
  invalidateScope();
  void load();
}
function repeatPolicyStale() {
  // A command refusal is not proof of ownership. Hide new commands and re-read.
  if (repeatSettings.value === true) repeatSettings.value = false;
  repeatPolicyRevision.value++;
}
const interactions = ref(new Map<string, 'draft' | 'pending' | 'uncertain'>());
const guardBusy = ref<'rating' | 'picker' | 'repeat' | 'visibility' | 'recovery' | null>(null);
const dialogKey = ref(0);
const discardDialog = ref<InstanceType<typeof BaseConfirmDialog>>();
let decision: ((allow: boolean) => void) | undefined;
function hasRatingRequest() {
  return [...interactions.value.values()].includes('pending');
}
function settle(allow: boolean) {
  decision?.(
    allow &&
      recoveryState.value === 'idle' &&
      !hasRatingRequest() &&
      !hasRepeatRequest() &&
      visibilityState.value !== 'pending' &&
      pickerInteraction.value !== 'pending',
  );
  decision = undefined;
}
function resetInterruption() {
  interactions.value.clear();
  guardBusy.value = null;
  pickerInteraction.value = 'idle';
  pickerEpoch.value++;
  if (decision) {
    settle(false);
    dialogKey.value++;
  }
}
function markInteraction(roundId: string, state: 'idle' | 'draft' | 'pending' | 'uncertain') {
  if (state === 'idle') interactions.value.delete(roundId);
  else if (rounds.value.some((round) => round.round_id === roundId))
    interactions.value.set(roundId, state);
  if (!hasRatingRequest() && guardBusy.value === 'rating') guardBusy.value = null;
}
function markPickerInteraction(state: typeof pickerInteraction.value) {
  pickerInteraction.value = state;
  if (state !== 'pending' && guardBusy.value === 'picker') guardBusy.value = null;
}
watch(
  [repeatSettingsState, newRoundState],
  () => {
    if (!hasRepeatRequest() && guardBusy.value === 'repeat') guardBusy.value = null;
  },
  { flush: 'sync' },
);
watch(
  visibilityState,
  (state) => {
    if (state !== 'pending' && guardBusy.value === 'visibility') guardBusy.value = null;
  },
  { flush: 'sync' },
);
watch(
  recoveryState,
  (state) => {
    if (state !== 'pending' && guardBusy.value === 'recovery') guardBusy.value = null;
  },
  { flush: 'sync' },
);
function allowInterruption(entryOnly = false): boolean | Promise<boolean> {
  if (user.user.isLoged && recoveryState.value !== 'idle') {
    if (recoveryState.value === 'pending') guardBusy.value = 'recovery';
    return false;
  }
  const pickerState = pickerInteraction.value;
  const states = [
    repeatSettingsState.value,
    newRoundState.value,
    entryOnly && visibilityState.value !== 'pending' ? 'idle' : visibilityState.value,
  ];
  const repeatEdited = states.some((state) => state !== 'idle');
  const repeatUncertain = states.includes('uncertain');
  if (!user.user.isLoged || (!interactions.value.size && pickerState === 'idle' && !repeatEdited))
    return true;
  if (
    hasRatingRequest() ||
    pickerState === 'pending' ||
    hasRepeatRequest() ||
    visibilityState.value === 'pending'
  ) {
    guardBusy.value =
      visibilityState.value === 'pending'
        ? 'visibility'
        : hasRepeatRequest()
          ? 'repeat'
          : pickerState === 'pending'
            ? 'picker'
            : 'rating';
    return false;
  }
  if (decision || !discardDialog.value) return false;
  const pending = new Promise<boolean>((resolve) => {
    decision = resolve;
  });
  const ratingDraft = interactions.value.size > 0;
  const copy = [...interactions.value.values()].includes('uncertain')
    ? {
        title: 'rankingRepeatedRounds.leaveTitle',
        message: 'rankingRepeatedRounds.leaveUncertain',
        ok: 'rankingRepeatedRounds.leave',
        cancel: 'rankingRepeatedRounds.stay',
      }
    : repeatEdited && pickerState !== 'uncertain'
      ? {
          title: 'rankingRepeatedRounds.leaveTitle',
          message: repeatUncertain
            ? 'rankingRepeatedRounds.leaveUncertain'
            : 'rankingRepeatedRounds.leaveDraft',
          ok: 'rankingRepeatedRounds.leave',
          cancel: 'rankingRepeatedRounds.stay',
        }
      : pickerState === 'uncertain'
        ? {
            title: 'rankingTmdbPicker.uncertainLeaveTitle',
            message: ratingDraft
              ? 'rankingTmdbPicker.uncertainAndRating'
              : 'rankingTmdbPicker.uncertainLeaveHint',
            ok: 'rankingTmdbPicker.leaveAnyway',
            cancel: 'rankingTmdbPicker.stay',
          }
        : pickerState === 'draft'
          ? {
              title: 'rankingTmdbPicker.discardTitle',
              message: ratingDraft
                ? 'rankingTmdbPicker.discardAndRating'
                : 'rankingTmdbPicker.discardHint',
              ok: 'rankingTmdbPicker.discard',
              cancel: 'rankingTmdbPicker.stay',
            }
          : {
              title: 'rankingRoundPanel.discardTitle',
              message: 'rankingRoundPanel.discardHint',
              ok: 'rankingRoundPanel.discard',
              cancel: 'rankingRoundPanel.stay',
            };
  void discardDialog.value.show({
    title: () => t(copy.title),
    message: () => t(copy.message),
    ok: () => t(copy.ok),
    cancel: () => t(copy.cancel),
    persistent: false,
  });
  return pending;
}
onBeforeRouteLeave(() => allowInterruption());
onBeforeRouteUpdate(
  (to, from) => to.params.rankingId === from.params.rankingId || allowInterruption(),
);
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
  newRoundState.value = 'idle';
  resetInterruption();
  detailController?.abort();
  selected.value = null;
  rounds.value = [];
  roundCursor.value = null;
  aggregate.value = null;
  aggregateEpoch++;
  detailError.value = '';
  detailLoading.value = false;
}
async function load(more = false, replace = false) {
  if ((loading.value && !replace) || !user.user.isLoged) return;
  const started = epoch;
  const rankingId = props.rankingId;
  const request = new AbortController();
  controller?.abort();
  controller = request;
  loading.value = true;
  error.value = '';
  try {
    const access = await catalog.summary(rankingId, request.signal);
    if (started !== epoch || request.signal.aborted) return;
    recoveryGrant.value = access.capabilities
      .filter((capability) => ['READ', 'REMOVE_ENTRY', 'REMOVE_OWN_ENTRY'].includes(capability))
      .sort()
      .join(':');
    const page = await catalog.entries(
      rankingId,
      more ? cursor.value || undefined : undefined,
      request.signal,
    );
    if (started !== epoch || request.signal.aborted) return;
    rankingName.value = access.name;
    approvalAdmission.value = access.admission === 'APPROVAL';
    canRate.value = access.capabilities.includes('RATE_OWN');
    canAdd.value =
      access.capabilities.includes('READ') && access.capabilities.includes('ADD_ENTRY');
    const share = access.can_share_open_link === true && access.admission === 'OPEN';
    if (!share) resetOpenLink();
    canShareOpenLink.value = share;
    canInvite.value =
      access.admission === 'INVITATION' &&
      access.capabilities.includes('READ') &&
      access.capabilities.includes('INVITE_MEMBER');
    entries.value = [
      ...new Map(
        [...(more ? entries.value : []), ...page.items].map((e) => [e.entry_id, e]),
      ).values(),
    ];
    cursor.value = more && page.next_cursor === cursor.value ? null : page.next_cursor;
  } catch (e) {
    if (started === epoch && !request.signal.aborted) {
      canInvite.value = false;
      resetOpenLink();
      error.value = message(e);
      if (error.value === 'unavailable' || error.value === 'sessionExpired') {
        clearRepeatOwner();
        canAdd.value = false;
        canRate.value = false;
        recoveryGrant.value = '';
        rankingName.value = undefined;
        approvalAdmission.value = false;
        entries.value = [];
        cursor.value = null;
        clearDetail();
      }
    }
  } finally {
    if (started === epoch && !request.signal.aborted) loading.value = false;
  }
}
function reset() {
  epoch++;
  visibilityState.value = 'idle';
  clearRepeatOwner();
  controller?.abort();
  clearDetail();
  canRate.value = false;
  recoveryGrant.value = '';
  recoveryState.value = 'idle';
  canInvite.value = false;
  resetOpenLink();
  canAdd.value = false;
  pickerNotice.value = '';
  invitationUnavailable.value = false;
  rankingName.value = undefined;
  approvalAdmission.value = false;
  uncertain.value.clear();
  entries.value = [];
  cursor.value = null;
  loading.value = false;
  error.value = '';
  if (mounted) void load();
}
watch([() => props.rankingId, () => user.user.generation, () => user.user.isLoged], reset, {
  flush: 'sync',
});
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
async function selectEntry(entry: RankingEntry, retry = false) {
  if (entry.entry_id === selected.value?.entry_id && !retry) return;
  const started = epoch,
    current = selection;
  if (!(await allowInterruption(true)) || started !== epoch || current !== selection) return;
  await open(entry);
}
async function open(entry: RankingEntry, more = false, refresh = false) {
  if (more && detailLoading.value) return;
  if (refresh) detailController?.abort();
  if (!more && !refresh) {
    clearDetail();
    selected.value = entry;
  }
  const started = epoch,
    current = selection;
  const request = new AbortController();
  detailController = request;
  detailLoading.value = true;
  detailError.value = '';
  try {
    const page = await catalog.rounds(
      props.rankingId,
      entry.entry_id,
      more ? (roundCursor.value ?? undefined) : undefined,
      request.signal,
    );
    if (started !== epoch || current !== selection || request.signal.aborted) return;
    const summary = more
      ? aggregate.value
      : await catalog.aggregate(props.rankingId, entry.entry_id, request.signal);
    if (started !== epoch || current !== selection || request.signal.aborted) return;
    rounds.value = [
      ...new Map(
        [
          ...(more ? rounds.value : []),
          ...page.items.map((round) =>
            more &&
            rounds.value.some(
              (current) => current.round_id === round.round_id && current.revealed === true,
            )
              ? { ...round, revealed: true }
              : round,
          ),
        ].map((r) => [r.round_id, r]),
      ).values(),
    ];
    roundCursor.value = more && page.next_cursor === roundCursor.value ? null : page.next_cursor;
    aggregate.value = summary;
  } catch (e) {
    if (started === epoch && current === selection && !request.signal.aborted) {
      detailError.value = message(e);
      if (detailError.value === 'unavailable' || detailError.value === 'sessionExpired') {
        clearRepeatOwner();
        canInvite.value = false;
        resetOpenLink();
        canAdd.value = false;
        resetInterruption();
        rounds.value = [];
        aggregate.value = null;
        aggregateEpoch++;
        roundCursor.value = null;
      }
    }
  } finally {
    if (started === epoch && current === selection && !request.signal.aborted)
      detailLoading.value = false;
  }
}
function invalidateScope() {
  epoch++;
  visibilityState.value = 'idle';
  clearRepeatOwner();
  controller?.abort();
  canRate.value = false;
  recoveryGrant.value = '';
  recoveryState.value = 'idle';
  canInvite.value = false;
  resetOpenLink();
  canAdd.value = false;
  rankingName.value = undefined;
  approvalAdmission.value = false;
  entries.value = [];
  cursor.value = null;
  loading.value = false;
  clearDetail();
}
async function lostPickerAccess(status: number) {
  invalidateScope();
  pickerNotice.value = status === 409 ? 'archived' : status === 401 ? '' : 'unavailable';
  if (status === 401) error.value = 'sessionExpired';
  else await load();
}
function refreshAfterImport(result: ImportReceipt & { rankingId: string }) {
  if (
    result.rankingId !== props.rankingId ||
    !canAdd.value ||
    !user.user.isLoged ||
    !pickerEnabled.value
  )
    return;
  pickerNotice.value = '';
  cursor.value = null;
  void load(false, true);
}
async function lostInvitationAccess(status: number) {
  invalidateScope();
  invitationUnavailable.value = status !== 401;
  if (status === 401) error.value = 'sessionExpired';
  else await load();
}
async function lostScope(status: number) {
  const previousId = selected.value?.entry_id;
  invalidateScope();
  const started = epoch;
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
function lostRoundScope(status: number) {
  invalidateScope();
  error.value = status === 401 ? 'sessionExpired' : 'unavailable';
}
function reconcileRecovery() {
  // A catalog page is not proof of success after an ambiguous write. Clear selection and
  // reload authorization and entries; let the recovery panel separately reload its directory.
  clearDetail();
  void load(false, true);
}
function entryLifecycleChanged(kind: 'remove' | 'restore', entryId: string) {
  if (kind === 'remove')
    entries.value = entries.value.filter((entry) => entry.entry_id !== entryId);
  if (selected.value?.entry_id === entryId) clearDetail();
  void load(false, true);
}
function lostRecoverySession() {
  invalidateScope();
  error.value = 'sessionExpired';
}
function roundTransition(scope: RoundScope) {
  if (scope.rankingId !== props.rankingId || scope.entryId !== selected.value?.entry_id) return;
  const matching = rounds.value.find((round) => round.round_id === scope.roundId);
  if (!matching || matching.revealed !== false) return;
  rounds.value = rounds.value.map((round) =>
    round.round_id === scope.roundId ? { ...round, revealed: true } : round,
  );
  void refreshAggregate();
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
    <BaseConfirmDialog
      :key="dialogKey"
      ref="discardDialog"
      @ok="settle(true)"
      @cancel="settle(false)"
    />
    <p v-if="guardBusy" role="status">
      {{
        t(
          guardBusy === 'recovery'
            ? 'rankingEntryRecovery.busy'
            : guardBusy === 'visibility'
              ? 'rankingVisibility.busy'
              : guardBusy === 'repeat'
                ? 'rankingRepeatedRounds.busy'
                : guardBusy === 'picker'
                  ? 'rankingTmdbPicker.busyLeave'
                  : 'rankingRoundPanel.busy',
        )
      }}
    </p>
    <NuxtLink to="/movies/collections" class="mm-detail-back">{{
      t('rankingDetail.back')
    }}</NuxtLink>
    <header>
      <h1>
        {{
          rankingName === undefined
            ? t('rankingDetail.title')
            : rankingName || t('rankings.unnamed')
        }}
      </h1>
      <p>{{ t('rankingOwnRating.intro') }}</p>
      <p v-if="approvalAdmission">
        <strong>{{ t('rankings.admission.APPROVAL') }}</strong
        >: {{ t('rankings.approvalRequestsUnavailable') }}
      </p>
      <div v-if="canShareOpenLink && user.user.isLoged && !loading">
        <button type="button" class="mm-button" :disabled="copyingOpenLink" @click="copyOpenLink">
          {{ t('rankingDetail.copyOpenLink') }}
        </button>
        <p v-if="openLinkNotice" role="status">{{ t(`rankingDetail.${openLinkNotice}`) }}</p>
      </div>
    </header>
    <p v-if="loading && !entries.length" role="status">{{ t('rankingDetail.loading') }}</p>
    <div v-if="error" role="alert">
      <p>{{ t(`rankingDetail.${error}`) }}</p>
      <button class="mm-button" :disabled="loading" @click="load(Boolean(entries.length))">
        {{ t('rankingDetail.retry') }}
      </button>
    </div>
    <p v-else-if="!loading && !entries.length">{{ t('rankingDetail.empty') }}</p>
    <p v-if="invitationUnavailable" role="alert">{{ t('rankingInvitationIssuer.unavailable') }}</p>
    <RankingInvitationIssuer
      v-if="canInvite && user.user.isLoged"
      class="mm-detail-issuer"
      :ranking-id="rankingId"
      :can-invite="canInvite"
      @access-lost="lostInvitationAccess"
    />
    <RankingVisibilitySettings
      v-if="rankingName !== undefined && user.user.isLoged"
      :ranking-id="rankingId"
      :block-write="
        recoveryState !== 'idle' ||
        hasRepeatRequest() ||
        hasRatingRequest() ||
        pickerInteraction === 'pending'
      "
      @scope-lost="lostRepeatOwner"
      @interaction="visibilityState = $event"
    />
    <RankingRepeatedRoundsSettings
      v-if="rankingName !== undefined && user.user.isLoged"
      :ranking-id="rankingId"
      :revision="repeatPolicyRevision"
      :block-write="
        recoveryState !== 'idle' ||
        newRoundState !== 'idle' ||
        visibilityState !== 'idle' ||
        hasRatingRequest() ||
        pickerInteraction === 'pending'
      "
      @settings="rememberRepeatSettings"
      @scope-lost="lostRepeatOwner"
      @interaction="repeatSettingsState = $event"
    />
    <p v-if="pickerNotice" role="alert">{{ t(`rankingTmdbPicker.${pickerNotice}`) }}</p>
    <RankingTmdbPicker
      v-if="pickerEnabled && canAdd && user.user.isLoged"
      :key="pickerEpoch"
      class="mm-detail-picker"
      :ranking-id="rankingId"
      :can-add="canAdd"
      :enabled="pickerEnabled"
      @imported="refreshAfterImport"
      @scope-lost="lostPickerAccess"
      @interaction="markPickerInteraction"
    />
    <div class="mm-detail-layout">
      <section :aria-label="t('rankingDetail.catalog')" :aria-busy="loading">
        <ul class="mm-detail-catalog">
          <li v-for="entry in entries" :key="entry.entry_id">
            <RankingEntryCard
              :entry="entry"
              :selected="selected?.entry_id === entry.entry_id"
              @select="selectEntry(entry)"
            />
          </li>
        </ul>
        <button v-if="cursor" class="mm-button" :disabled="loading" @click="load(true)">
          {{ t('rankingDetail.more') }}
        </button>
        <RankingEntryRecovery
          v-if="recoveryGrant.includes('REMOVE_') && user.user.isLoged"
          :key="recoveryGrant"
          :ranking-id="rankingId"
          :entry="
            selected && !detailError
              ? {
                  id: selected.entry_id,
                  title: entryTitle(selected, locale, t('rankingDetail.untitled')),
                }
              : null
          "
          :block-write="
            loading ||
            detailLoading ||
            interactions.size > 0 ||
            pickerInteraction !== 'idle' ||
            repeatSettingsState !== 'idle' ||
            visibilityState !== 'idle' ||
            newRoundState !== 'idle'
          "
          @changed="entryLifecycleChanged"
          @reconcile="reconcileRecovery"
          @session-lost="lostRecoverySession"
          @interaction="recoveryState = $event"
        />
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
          <button class="mm-button" :disabled="detailLoading" @click="selectEntry(selected, true)">
            {{ t('rankingDetail.retry') }}
          </button>
        </div>
        <template v-if="aggregate">
          <p v-if="aggregate.partial">{{ t('rankingDetail.partial') }}</p>
          <p v-if="aggregate.votes === 0n">
            {{ t(aggregate.partial ? 'rankingDetail.unratedPartial' : 'rankingDetail.unrated') }}
          </p>
          <p v-else>
            {{ t(aggregate.partial ? 'rankingDetail.partialMean' : 'rankingDetail.mean') }}:
            <strong>{{ formatRatingMean(aggregate.total, aggregate.votes, locale) }}</strong>
            <small class="mm-detail-exact"
              >{{ t('rankingDetail.exactRatio') }} {{ aggregate.total.toString() }} /
              {{ aggregate.votes.toString() }}</small
            >
          </p>
        </template>
        <p v-if="!detailLoading && !detailError && !rounds.length">
          {{ t('rankingDetail.noRounds') }}
        </p>
        <RankingNewRoundForm
          v-if="repeatSettings !== null && !detailError"
          :key="selected.entry_id"
          v-model:intent="repeatIntent"
          :ranking-id="rankingId"
          :entry-id="selected.entry_id"
          :owner-authorized="repeatSettings !== null"
          :repeat-enabled="repeatSettings === true"
          :block-write="
            recoveryState !== 'idle' ||
            repeatSettingsState !== 'idle' ||
            visibilityState !== 'idle' ||
            hasRatingRequest() ||
            pickerInteraction === 'pending'
          "
          @created="confirmedRepeatedRound"
          @settings="rememberRepeatSettings"
          @policy-stale="repeatPolicyStale"
          @scope-lost="lostRepeatOwner"
          @interaction="newRoundState = $event"
        />
        <ol class="mm-detail-rounds">
          <li v-for="round in rounds" :key="round.round_id">
            <RankingRoundPanel
              :ranking-id="rankingId"
              :entry-id="selected.entry_id"
              :movie-id="selected.movie_id"
              :copy-enabled="copyEnabled"
              :entry-title="entryTitle(selected, locale, t('rankingDetail.untitled'))"
              :round="round"
              :can-rate="canRate"
              :reconcile="uncertain.has(round.round_id)"
              @scope-lost="lostRoundScope"
              @own-scope-lost="lostScope"
              @interaction="markInteraction(round.round_id, $event)"
              @transitioned="roundTransition"
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
.mm-detail-issuer,
.mm-detail-picker {
  margin-bottom: 20px;
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
