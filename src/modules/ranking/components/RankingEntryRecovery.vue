<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import BaseConfirmDialog from '~/core/components/BaseConfirmDialog.vue';
import { useUserStore } from '~/core/stores/UserStore';
import recovery, {
  RankingEntryRecoveryError,
  type RecoverableEntry,
} from '../services/RankingEntryRecoveryService';
import removal, { RankingEntryRemovalError } from '../services/RankingEntryRemovalService';

type Intent =
  | { kind: 'remove'; id: string; title: string; version: bigint }
  | { kind: 'restore'; row: RecoverableEntry };
const props = defineProps<{
  rankingId: string;
  entry?: { id: string; title: string } | null;
  blockWrite?: boolean;
}>();
const emit = defineEmits<{
  changed: [kind: 'remove' | 'restore', entryId: string];
  reconcile: [];
  sessionLost: [];
  interaction: [state: 'idle' | 'draft' | 'pending'];
}>();
const { t, locale } = useI18n();
const user = useUserStore();
const dialog = ref<InstanceType<typeof BaseConfirmDialog>>();
const heading = ref<HTMLElement>();
const dialogEpoch = ref(0);
const expanded = ref(false);
const loading = ref(false);
const listingError = ref('');
const rows = ref<RecoverableEntry[]>([]);
const cursor = ref<string | null>(null);
const intent = ref<Intent | null>(null);
const writing = ref(false);
const checking = ref(false);
const denied = ref(false);
const message = ref('');
const expires = ref('');
const state = computed(() => (writing.value ? 'pending' : intent.value ? 'draft' : 'idle'));
watch(state, (value) => emit('interaction', value), { flush: 'sync' });
let epoch = 0;
let listing: AbortController | undefined;
let preview: AbortController | undefined;
let confirmationOpener: HTMLElement | undefined;

function reset() {
  epoch++;
  dialogEpoch.value++;
  listing?.abort();
  preview?.abort();
  expanded.value = false;
  loading.value = false;
  listingError.value = '';
  rows.value = [];
  cursor.value = null;
  intent.value = null;
  confirmationOpener = undefined;
  writing.value = false;
  checking.value = false;
  denied.value = false;
  message.value = '';
  expires.value = '';
}
watch([() => props.rankingId, () => user.user.generation, () => user.user.isLoged], reset, {
  flush: 'sync',
});
watch(
  () => props.entry?.id,
  () => {
    preview?.abort();
    checking.value = false;
  },
  { flush: 'sync' },
);
onBeforeUnmount(reset);
function date(value: string) {
  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
function failure(error: unknown) {
  if (error instanceof RankingEntryRecoveryError || error instanceof RankingEntryRemovalError)
    return { status: error.status, code: error.code };
  return {};
}
function loseScope(session: boolean) {
  listing?.abort();
  preview?.abort();
  rows.value = [];
  cursor.value = null;
  loading.value = false;
  checking.value = false;
  intent.value = null;
  confirmationOpener = undefined;
  dialogEpoch.value++;
  message.value = '';
  expires.value = '';
  denied.value = true;
  if (session) emit('sessionLost');
}
async function refresh(more = false) {
  if (!user.user.isLoged || !expanded.value || denied.value || (more && !cursor.value)) return;
  const started = epoch;
  const request = new AbortController();
  listing?.abort();
  listing = request;
  const after = more ? (cursor.value ?? undefined) : undefined;
  if (!more) {
    rows.value = [];
    cursor.value = null;
  }
  loading.value = true;
  listingError.value = '';
  try {
    const result = await recovery.list(props.rankingId, after, request.signal);
    if (started !== epoch || request.signal.aborted) return;
    rows.value = more ? [...rows.value, ...result.items] : result.items;
    cursor.value = result.next_cursor;
  } catch (error) {
    if (started !== epoch || request.signal.aborted) return;
    const { status, code } = failure(error);
    if (status === 401 || status === 403 || status === 404 || code === 'ranking.archived_read_only')
      loseScope(status === 401);
    else listingError.value = 'listError';
  } finally {
    if (started === epoch && !request.signal.aborted) loading.value = false;
  }
}
function toggle() {
  expanded.value = !expanded.value;
  if (expanded.value) void refresh();
  else {
    listing?.abort();
    loading.value = false;
    rows.value = [];
    cursor.value = null;
    listingError.value = '';
  }
}
function ask(command: Intent, opener: HTMLElement) {
  if (!dialog.value) return;
  confirmationOpener = opener;
  intent.value = command;
  const title = command.kind === 'remove' ? command.title : command.row.title;
  const name = () => title || t('rankingEntryRecovery.untitled');
  void dialog.value.show({
    title: () => (intent.value ? t(`rankingEntryRecovery.${command.kind}Title`) : ''),
    message: () =>
      intent.value
        ? t(`rankingEntryRecovery.${command.kind}Warning`, {
            title: name(),
            ...(command.kind === 'restore' ? { expires: date(command.row.expires_at) } : {}),
          })
        : '',
    ok: () => t(`rankingEntryRecovery.${command.kind}Confirm`),
    persistent: false,
    focus: 'cancel',
  });
}
const canAct = computed(
  () =>
    !props.blockWrite &&
    !loading.value &&
    !checking.value &&
    !writing.value &&
    !intent.value &&
    user.user.isLoged,
);
async function askRemove(event: MouseEvent) {
  const entry = props.entry;
  const opener = event.currentTarget;
  if (!canAct.value || !entry || denied.value || !(opener instanceof HTMLElement)) return;
  const started = epoch;
  const request = new AbortController();
  preview = request;
  checking.value = true;
  message.value = '';
  expires.value = '';
  try {
    const receipt = await removal.preview(props.rankingId, entry.id, request.signal);
    if (started !== epoch || request.signal.aborted || entry.id !== props.entry?.id) return;
    if (receipt.removed_at !== null) {
      message.value = 'stale';
      expanded.value = true;
      emit('reconcile');
      void refresh();
    } else if (!props.blockWrite)
      ask({ kind: 'remove', id: entry.id, title: entry.title, version: receipt.version }, opener);
  } catch (error) {
    if (started !== epoch || request.signal.aborted) return;
    const { status, code } = failure(error);
    if (status === 401) loseScope(true);
    else if (status === 403 || status === 404 || code === 'ranking.archived_read_only')
      message.value = 'notAvailable';
    else message.value = 'previewError';
  } finally {
    if (started === epoch && !request.signal.aborted) checking.value = false;
  }
}
function askRestore(row: RecoverableEntry, event: MouseEvent) {
  const opener = event.currentTarget;
  if (!canAct.value || denied.value || loading.value || !(opener instanceof HTMLElement)) return;
  message.value = '';
  expires.value = '';
  ask({ kind: 'restore', row }, opener);
}
function clearIntent() {
  intent.value = null;
  confirmationOpener = undefined;
}
async function cancel() {
  const opener = confirmationOpener;
  const started = epoch;
  clearIntent();
  // Asynchronous preview may have disabled the opener when the native dialog captured focus.
  await nextTick();
  if (started !== epoch) return;
  if (opener?.isConnected) opener.focus();
  else heading.value?.focus();
}
async function confirm() {
  const command = intent.value;
  if (!command || writing.value) return;
  if (
    props.blockWrite ||
    denied.value ||
    !user.user.isLoged ||
    (command.kind === 'remove' && command.id !== props.entry?.id)
  ) {
    void cancel();
    return;
  }
  const started = epoch;
  const entryId = command.kind === 'remove' ? command.id : command.row.entry_id;
  writing.value = true;
  clearIntent();
  try {
    if (command.kind === 'remove') {
      const receipt = await removal.remove(props.rankingId, entryId, command.version);
      if (started !== epoch) return;
      message.value = 'removed';
      expires.value = receipt.expires_at ?? '';
      expanded.value = true;
    } else {
      await recovery.restoreCurrent(props.rankingId, entryId, command.row.version);
      if (started !== epoch) return;
      message.value = 'restored';
    }
    emit('changed', command.kind, entryId);
    await refresh();
  } catch (error) {
    if (started !== epoch) return;
    const { status, code } = failure(error);
    if (status === 401) loseScope(true);
    else {
      message.value =
        code === 'ranking.entry_recovery_expired'
          ? 'expired'
          : code === 'ranking.entry_state_stale'
            ? 'stale'
            : status === 404 || status === 403 || code === 'ranking.archived_read_only'
              ? 'notAvailable'
              : 'unknown';
      if (command.kind === 'remove') expanded.value = true;
      emit('reconcile');
      await refresh();
    }
  } finally {
    if (started === epoch) {
      writing.value = false;
      await nextTick();
      if (started === epoch) heading.value?.focus();
    }
  }
}
</script>
<template>
  <section class="mm-entry-recovery" :aria-busy="loading || writing || checking">
    <h2 ref="heading" tabindex="-1">{{ t('rankingEntryRecovery.title') }}</h2>
    <template v-if="!denied">
      <p>{{ t('rankingEntryRecovery.hint') }}</p>
      <div class="mm-recovery-actions">
        <button v-if="entry" type="button" class="mm-button" :disabled="!canAct" @click="askRemove">
          {{ t('rankingEntryRecovery.remove') }}
        </button>
        <button
          type="button"
          class="mm-button"
          :aria-expanded="expanded"
          :disabled="checking || writing || Boolean(intent)"
          @click="toggle"
        >
          {{ t(expanded ? 'rankingEntryRecovery.close' : 'rankingEntryRecovery.open') }}
        </button>
      </div>
    </template>
    <p v-if="message" :role="message === 'removed' || message === 'restored' ? 'status' : 'alert'">
      {{ t(`rankingEntryRecovery.${message}`, { expires: expires ? date(expires) : '' }) }}
    </p>
    <p v-if="denied" role="alert">{{ t('rankingEntryRecovery.notAvailable') }}</p>
    <div v-else-if="expanded">
      <p v-if="loading" role="status">{{ t('rankingEntryRecovery.loading') }}</p>
      <div v-if="listingError" role="alert">
        <p>{{ t(`rankingEntryRecovery.${listingError}`) }}</p>
        <button type="button" class="mm-button" :disabled="loading || checking" @click="refresh()">
          {{ t('rankingEntryRecovery.retry') }}
        </button>
      </div>
      <p v-else-if="!loading && !rows.length">{{ t('rankingEntryRecovery.empty') }}</p>
      <ul v-if="rows.length">
        <li v-for="row in rows" :key="row.entry_id">
          <h3>{{ row.title || t('rankingEntryRecovery.untitled') }}</h3>
          <p>
            {{ t('rankingEntryRecovery.removedAt') }}
            <time :datetime="row.removed_at">{{ date(row.removed_at) }}</time>
            <br />
            {{ t('rankingEntryRecovery.expiresAt') }}
            <time :datetime="row.expires_at">{{ date(row.expires_at) }}</time>
          </p>
          <button
            type="button"
            class="mm-button"
            :aria-label="
              t('rankingEntryRecovery.restoreNamed', {
                title: row.title || t('rankingEntryRecovery.untitled'),
              })
            "
            :disabled="!canAct || loading"
            @click="askRestore(row, $event)"
          >
            {{ t('rankingEntryRecovery.restore') }}
          </button>
        </li>
      </ul>
      <button
        v-if="cursor"
        type="button"
        class="mm-button"
        :disabled="loading || checking || writing || Boolean(intent)"
        @click="refresh(true)"
      >
        {{ t('rankingEntryRecovery.more') }}
      </button>
    </div>
    <BaseConfirmDialog :key="dialogEpoch" ref="dialog" @ok="confirm" @cancel="cancel" />
  </section>
</template>
<style scoped>
.mm-entry-recovery {
  min-width: 0;
  overflow-wrap: anywhere;
  padding: 16px;
  margin-block: 16px;
  border: 1px solid var(--mm-border);
  border-radius: 16px;
  background: var(--mm-surface);
}
.mm-entry-recovery h2,
.mm-entry-recovery h3 {
  margin-top: 0;
}
.mm-recovery-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.mm-entry-recovery ul {
  list-style: none;
  display: grid;
  gap: 12px;
  padding: 0;
}
.mm-entry-recovery li {
  padding-block: 12px;
  border-top: 1px solid var(--mm-border);
}
</style>
