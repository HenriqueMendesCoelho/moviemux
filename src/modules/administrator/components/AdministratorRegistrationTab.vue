<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import BaseConfirmDialog from '~/core/components/BaseConfirmDialog.vue';
import BaseSelect from '~/core/components/BaseSelect.vue';
import { useUserStore } from '~/core/stores/UserStore';
import { isRegistrationMode, type RegistrationMode } from '~/core/registration-mode';
import registration, {
  AdminRegistrationError,
  type WaitlistInviteReceipt,
  type WaitlistRequest,
  type WaitlistStatus,
} from '../services/AdminRegistrationService';

const { t, locale } = useI18n();
const user = useUserStore();
const mayRequest = computed(() => user.user.isLoged && user.isAdmin);
const mode = ref<RegistrationMode>();
const draft = ref('');
const rows = ref<WaitlistRequest[]>([]);
const cursor = ref<string>();
const nextCursor = ref<string | null>(null);
const previous = ref<Array<string | undefined>>([]);
const busy = ref(false);
const message = ref('');
const error = ref('');
const receipt = shallowRef<WaitlistInviteReceipt & { email: string }>();
const confirm = ref<InstanceType<typeof BaseConfirmDialog>>();
const feedback = ref<HTMLElement>();
const codeInput = ref<HTMLInputElement>();
type Action =
  { kind: 'mode'; mode: RegistrationMode } | { kind: 'invite'; request: WaitlistRequest };
const proposed = shallowRef<Action>();
let epoch = 0;
let active: AbortController | undefined;
let mounted = false;
let opener: HTMLElement | null = null;

const options = computed(() =>
  (['INVITE_ONLY', 'WAITLIST', 'OPEN'] as const).map((value) => ({
    value,
    label: t(`registrationAdmin.modes.${value}`),
  })),
);

function clearData() {
  mode.value = undefined;
  draft.value = '';
  rows.value = [];
  cursor.value = undefined;
  nextCursor.value = null;
  previous.value = [];
  receipt.value = undefined;
  proposed.value = undefined;
  opener = null;
}
function reset() {
  epoch++;
  active?.abort();
  active = undefined;
  busy.value = false;
  error.value = '';
  message.value = '';
  clearData();
}
function begin() {
  if (!mayRequest.value || busy.value || !mounted) return undefined;
  const controller = new AbortController();
  active?.abort();
  active = controller;
  busy.value = true;
  error.value = '';
  message.value = '';
  receipt.value = undefined;
  const started = epoch;
  const current = () =>
    mounted && mayRequest.value && started === epoch && !controller.signal.aborted;
  return {
    signal: controller.signal,
    current,
    done() {
      if (current()) {
        busy.value = false;
        active = undefined;
      }
    },
  };
}
function handleFailure(cause: unknown, fallback: string) {
  if (cause instanceof AdminRegistrationError && (cause.status === 401 || cause.status === 403)) {
    reset();
    error.value = 'unavailable';
    return;
  }
  error.value = fallback;
}
function installPage(
  result: Awaited<ReturnType<typeof registration.adminWaitlist>>,
  after: string | undefined,
  history: Array<string | undefined>,
) {
  // Never follow a server cursor already traversed in this paging session.
  if (result.next_cursor && history.includes(result.next_cursor))
    throw new AdminRegistrationError();
  rows.value = result.items;
  cursor.value = after;
  previous.value = history;
  nextCursor.value = result.next_cursor;
}
async function refresh() {
  const operation = begin();
  if (!operation) return;
  clearData();
  try {
    const value = await registration.adminMode(operation.signal);
    if (!operation.current()) return;
    const list = await registration.adminWaitlist(undefined, operation.signal);
    if (!operation.current()) return;
    mode.value = value;
    draft.value = value;
    installPage(list, undefined, []);
  } catch (cause) {
    if (operation.current()) handleFailure(cause, 'unavailable');
  } finally {
    operation.done();
  }
}
async function loadPage(after: string | undefined, history: Array<string | undefined>) {
  if (!mode.value) return;
  const operation = begin();
  if (!operation) return;
  rows.value = [];
  nextCursor.value = null;
  try {
    const list = await registration.adminWaitlist(after, operation.signal);
    if (operation.current()) installPage(list, after, history);
  } catch (cause) {
    if (operation.current()) {
      clearData();
      handleFailure(cause, 'unavailable');
    }
  } finally {
    operation.done();
  }
}
function nextPage() {
  if (nextCursor.value) void loadPage(nextCursor.value, [...previous.value, cursor.value]);
}
function previousPage() {
  if (previous.value.length) void loadPage(previous.value.at(-1), previous.value.slice(0, -1));
}
onMounted(() => {
  mounted = true;
  if (mayRequest.value) void refresh();
});
watch(
  [mayRequest, () => user.user.id, () => user.user.generation],
  () => {
    reset();
    if (mounted && mayRequest.value) void refresh();
  },
  { flush: 'sync' },
);
onBeforeUnmount(() => {
  mounted = false;
  reset();
});

function label(value: RegistrationMode) {
  return t(`registrationAdmin.modes.${value}`);
}
function canInvite(status: WaitlistStatus) {
  return status !== 'SENDING' && status !== 'REVOKED';
}
function actionText(status: WaitlistStatus) {
  if (status === 'GATEWAY_ACCEPTED') return 'retrieveCode';
  return status === 'PENDING' ? 'sendInvite' : 'retryInvite';
}
function requestDate(value: string) {
  return new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}
function showMode(event: MouseEvent) {
  if (
    busy.value ||
    proposed.value ||
    !mode.value ||
    !isRegistrationMode(draft.value) ||
    mode.value === draft.value
  )
    return;
  const target = draft.value;
  proposed.value = { kind: 'mode', mode: target };
  opener = event.currentTarget as HTMLElement;
  void confirm.value?.show({
    title: () => t('registrationAdmin.confirmModeTitle'),
    message: () => t('registrationAdmin.confirmModeMessage', { mode: label(target) }),
    ok: () => t('registrationAdmin.saveMode'),
    focus: 'cancel',
    persistent: false,
  });
}
function showInvite(request: WaitlistRequest, event: MouseEvent) {
  if (busy.value || proposed.value || !mode.value || !canInvite(request.status)) return;
  proposed.value = { kind: 'invite', request };
  opener = event.currentTarget as HTMLElement;
  const warning =
    request.status === 'GATEWAY_ACCEPTED'
      ? 'confirmRetrieve'
      : request.status === 'DELIVERY_UNKNOWN'
        ? 'confirmUnknown'
        : request.status === 'PENDING'
          ? 'confirmInvite'
          : 'confirmRetry';
  void confirm.value?.show({
    title: () => t('registrationAdmin.' + actionText(request.status)),
    message: () => t('registrationAdmin.' + warning, { email: request.email }),
    ok: () => t('registrationAdmin.' + actionText(request.status)),
    focus: 'cancel',
    persistent: false,
  });
}
async function cancel() {
  proposed.value = undefined;
  const target = opener;
  opener = null;
  await nextTick();
  if (mounted && target?.isConnected) target.focus();
}
async function apply() {
  const action = proposed.value;
  proposed.value = undefined;
  opener = null;
  if (!action || !mode.value) return;
  const operation = begin();
  if (!operation) return;
  try {
    if (action.kind === 'mode') {
      const saved = await registration.setAdminMode(action.mode, operation.signal);
      if (!operation.current()) return;
      mode.value = saved;
      draft.value = saved;
      message.value = 'modeSaved';
    } else {
      const result = await registration.inviteWaitlist(action.request.request_id, operation.signal);
      if (!operation.current()) return;
      receipt.value = { ...result, email: action.request.email };
      rows.value = rows.value.map((row) =>
        row.request_id === result.request_id ? { ...row, status: result.status } : row,
      );
    }
  } catch (cause) {
    if (!operation.current()) return;
    // A lost write response may have committed. Clear old authority/roster
    // and require a fresh read; never retry an invite or write automatically.
    clearData();
    handleFailure(cause, action.kind === 'mode' ? 'modeUnconfirmed' : 'inviteUnconfirmed');
  } finally {
    operation.done();
    await nextTick();
    if (operation.current()) feedback.value?.focus();
  }
}
async function copyCode() {
  const current = receipt.value;
  if (!current || !mode.value || busy.value || !mayRequest.value) return;
  const started = epoch;
  try {
    await navigator.clipboard.writeText(current.invite_code);
    if (started === epoch && receipt.value === current) message.value = 'copied';
  } catch {
    if (started === epoch && receipt.value === current) {
      error.value = 'copyFailed';
      codeInput.value?.focus();
      codeInput.value?.select();
    }
  }
}
</script>

<template>
  <section class="mm-form registration-admin" :aria-busy="busy">
    <h2>{{ t('registrationAdmin.title') }}</h2>
    <p class="mm-muted">{{ t('registrationAdmin.intro') }}</p>
    <p v-if="busy" role="status">{{ t('registrationAdmin.loading') }}</p>
    <p v-if="error" ref="feedback" tabindex="-1" role="alert" class="mm-error">
      {{ t('registrationAdmin.' + error) }}
    </p>
    <p v-else-if="message" ref="feedback" tabindex="-1" role="status">
      {{ t('registrationAdmin.' + message) }}
    </p>
    <div class="mm-actions">
      <button
        type="button"
        class="mm-btn"
        :disabled="busy || !!proposed || !mayRequest"
        @click="refresh"
      >
        {{ t('registrationAdmin.refresh') }}
      </button>
    </div>
    <template v-if="mode">
      <section class="registration-admin-section">
        <h3>{{ t('registrationAdmin.modeTitle') }}</h3>
        <p>{{ t('registrationAdmin.currentMode', { mode: label(mode) }) }}</p>
        <BaseSelect
          v-model="draft"
          :label="t('registrationAdmin.changeMode')"
          :options="options"
          :disabled="busy || !!proposed"
        />
        <p class="mm-muted">{{ t('registrationAdmin.modeHint') }}</p>
        <div class="mm-actions">
          <button
            type="button"
            class="mm-btn mm-btn-primary"
            :disabled="busy || !!proposed || mode === draft"
            @click="showMode"
          >
            {{ t('registrationAdmin.reviewMode') }}
          </button>
        </div>
      </section>
      <section class="registration-admin-section">
        <h3>{{ t('registrationAdmin.waitlistTitle') }}</h3>
        <p class="mm-muted">{{ t('registrationAdmin.waitlistHint') }}</p>
        <div v-if="receipt" class="registration-receipt" ref="feedback" tabindex="-1" role="status">
          <strong>{{ t('registrationAdmin.receiptFor', { email: receipt.email }) }}</strong>
          <span>{{ t('registrationAdmin.statuses.' + receipt.status) }}</span>
          <p>{{ t('registrationAdmin.copyHint') }}</p>
          <label class="mm-field">
            {{ t('registrationAdmin.inviteCode') }}
            <input
              ref="codeInput"
              :value="receipt.invite_code"
              readonly
              @focus="codeInput?.select()"
            />
          </label>
          <div class="mm-actions">
            <button type="button" class="mm-btn" @click="copyCode">
              {{ t('registrationAdmin.copyCode') }}
            </button>
            <button type="button" class="mm-btn" @click="receipt = undefined">
              {{ t('registrationAdmin.hideCode') }}
            </button>
          </div>
        </div>
        <ul v-if="rows.length" class="registration-requests">
          <li v-for="row in rows" :key="row.request_id" class="registration-request">
            <div class="registration-request-info">
              <strong>{{ row.email }}</strong>
              <span class="mm-muted">{{
                t('registrationAdmin.requested', { date: requestDate(row.requested_at) })
              }}</span>
              <span>{{ t('registrationAdmin.statuses.' + row.status) }}</span>
            </div>
            <button
              v-if="canInvite(row.status)"
              type="button"
              class="mm-btn"
              :disabled="busy || !!proposed"
              :aria-label="
                t('registrationAdmin.actionFor', {
                  action: t('registrationAdmin.' + actionText(row.status)),
                  email: row.email,
                })
              "
              @click="showInvite(row, $event)"
            >
              {{ t('registrationAdmin.' + actionText(row.status)) }}
            </button>
          </li>
        </ul>
        <p v-else-if="!busy" class="mm-muted">{{ t('registrationAdmin.empty') }}</p>
        <nav class="mm-actions" :aria-label="t('registrationAdmin.pagination')">
          <button
            type="button"
            class="mm-btn"
            :disabled="busy || !!proposed || !previous.length"
            @click="previousPage"
          >
            {{ t('registrationAdmin.previous') }}
          </button>
          <span role="status">{{
            t('registrationAdmin.page', { page: previous.length + 1 })
          }}</span>
          <button
            type="button"
            class="mm-btn"
            :disabled="busy || !!proposed || !nextCursor"
            @click="nextPage"
          >
            {{ t('registrationAdmin.next') }}
          </button>
        </nav>
      </section>
      <BaseConfirmDialog ref="confirm" @ok="apply" @cancel="cancel" />
    </template>
  </section>
</template>
<style scoped>
.registration-admin-section {
  display: grid;
  gap: 0.8rem;
  min-width: 0;
  padding-block: 1rem;
}
.registration-requests {
  display: grid;
  gap: 0.65rem;
  padding: 0;
  list-style: none;
}
.registration-request,
.registration-receipt {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
  border: 1px solid var(--mm-border);
  border-radius: 0.75rem;
  padding: 0.8rem;
  min-width: 0;
}
.registration-request-info {
  display: grid;
  min-width: 0;
  flex: 1 1 15rem;
  overflow-wrap: anywhere;
  gap: 0.2rem;
}
.registration-receipt {
  display: grid;
  align-items: start;
}
.registration-receipt input {
  min-width: 0;
  width: 100%;
}
</style>
