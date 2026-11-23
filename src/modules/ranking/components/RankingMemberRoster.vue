<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import BaseConfirmDialog from '~/core/components/BaseConfirmDialog.vue';
import { useUserStore } from '~/core/stores/UserStore';
import roster, {
  ROSTER_CAPABILITIES,
  RankingOwnerRosterError,
  type RankingCapability,
  type OwnerRosterMember,
} from '../services/RankingOwnerRosterService';

const props = defineProps<{ rankingId: string; blockWrite?: boolean }>();
const emit = defineEmits<{
  sessionLost: [];
  interaction: [state: 'idle' | 'draft' | 'pending'];
}>();
const { t } = useI18n();
const user = useUserStore();
const heading = ref<HTMLElement>();
const dialog = ref<InstanceType<typeof BaseConfirmDialog>>();
const dialogEpoch = ref(0);
const authorized = ref(false);
const expanded = ref(false);
const loading = ref(false);
const writing = ref(false);
const loadError = ref(false);
const notice = ref<'saved' | 'unknown' | 'invalid' | ''>('');
const members = ref<OwnerRosterMember[]>([]);
const cursor = ref<string | null>(null);
const draft = ref<{
  memberId: string;
  displayName: string | null;
  index: number;
  before: RankingCapability[];
  choices: RankingCapability[];
}>();
const changed = computed(() => {
  if (!draft.value) return false;
  const { before, choices } = draft.value;
  return choices.length !== before.length || choices.some((item) => !before.includes(item));
});
const draftLabel = computed(
  () =>
    draft.value?.displayName ??
    t('rankingMemberRoster.unnamed', { number: (draft.value?.index ?? 0) + 1 }),
);
const interaction = computed(() => (writing.value ? 'pending' : draft.value ? 'draft' : 'idle'));
watch(interaction, (state) => emit('interaction', state), { flush: 'sync' });

let epoch = 0;
let readRequest: AbortController | undefined;
let mounted = false;
let confirmOpener: HTMLElement | undefined;
let editOpener: HTMLElement | undefined;

function clearEditor() {
  draft.value = undefined;
  confirmOpener = undefined;
  editOpener = undefined;
}
function clearProjection() {
  members.value = [];
  cursor.value = null;
  clearEditor();
  dialogEpoch.value++;
}
function reset() {
  epoch++;
  readRequest?.abort();
  authorized.value = false;
  expanded.value = false;
  loading.value = false;
  writing.value = false;
  loadError.value = false;
  notice.value = '';
  clearProjection();
}
function statusOf(error: unknown) {
  return error instanceof RankingOwnerRosterError ? error.status : undefined;
}
async function read(more = false) {
  if (
    !user.user.isLoged ||
    (more && (!expanded.value || !cursor.value || loading.value || writing.value || draft.value))
  )
    return;
  const started = epoch;
  const request = new AbortController();
  readRequest?.abort();
  readRequest = request;
  const after = more ? (cursor.value ?? undefined) : undefined;
  if (!more) clearProjection();
  loading.value = true;
  loadError.value = false;
  try {
    const result = await roster.list(props.rankingId, after, request.signal);
    if (started !== epoch || request.signal.aborted) return;
    authorized.value = true;
    if (!expanded.value) return;
    members.value = more ? [...members.value, ...result.items] : result.items;
    cursor.value = result.next_cursor;
  } catch (error) {
    if (started !== epoch || request.signal.aborted) return;
    const status = statusOf(error);
    if (status === 401 || status === 403 || status === 404) {
      reset();
      if (status === 401) emit('sessionLost');
    } else {
      // Do not keep stale labels, drafts or writable controls after a failed read.
      clearProjection();
      loadError.value = true;
    }
  } finally {
    if (started === epoch && !request.signal.aborted) loading.value = false;
  }
}
watch(
  [() => props.rankingId, () => user.user.generation, () => user.user.isLoged],
  () => {
    reset();
    if (mounted && user.user.isLoged) void read();
  },
  { flush: 'sync' },
);
onMounted(() => {
  mounted = true;
  if (user.user.isLoged) void read();
});
onBeforeUnmount(() => {
  mounted = false;
  reset();
});

function label(member: OwnerRosterMember, index: number) {
  return member.display_name ?? t('rankingMemberRoster.unnamed', { number: index + 1 });
}
function permissions(values: readonly RankingCapability[]) {
  return values.length
    ? values.map((value) => t(`rankingMemberRoster.capabilities.${value}`)).join(', ')
    : t('rankingMemberRoster.none');
}
function toggle() {
  if (!authorized.value || loading.value || writing.value || draft.value) return;
  expanded.value = !expanded.value;
  notice.value = '';
  if (expanded.value) void read();
  else clearProjection();
}
async function edit(member: OwnerRosterMember, index: number, event: MouseEvent) {
  if (
    !authorized.value ||
    !expanded.value ||
    props.blockWrite ||
    loading.value ||
    writing.value ||
    draft.value ||
    !(event.currentTarget instanceof HTMLElement)
  )
    return;
  const opener = event.currentTarget;
  const started = epoch;
  editOpener = opener;
  notice.value = '';
  draft.value = {
    memberId: member.membership_id,
    displayName: member.display_name,
    index,
    before: [...member.capabilities],
    choices: [...member.capabilities],
  };
  await nextTick();
  if (started === epoch)
    opener.closest('li')?.querySelector<HTMLInputElement>('form input')?.focus();
}
function setCapability(capability: RankingCapability, on: boolean) {
  const current = draft.value;
  if (!current || writing.value || confirmOpener) return;
  current.choices = ROSTER_CAPABILITIES.filter((value) =>
    value === capability ? on : current.choices.includes(value),
  );
}
async function leaveEditor() {
  const opener = editOpener;
  const started = epoch;
  clearEditor();
  await nextTick();
  if (started === epoch) (opener?.isConnected ? opener : heading.value)?.focus();
}
function confirm(event: MouseEvent) {
  const current = draft.value;
  if (
    !authorized.value ||
    !current ||
    !changed.value ||
    confirmOpener ||
    !dialog.value ||
    writing.value ||
    loading.value ||
    props.blockWrite ||
    !(event.currentTarget instanceof HTMLElement)
  )
    return;
  confirmOpener = event.currentTarget;
  // Make native dialog focus restoration work for pointer and keyboard activation.
  confirmOpener.focus();
  const all = !current.choices.length;
  void dialog.value.show({
    title: () => t(all ? 'rankingMemberRoster.revokeTitle' : 'rankingMemberRoster.confirmTitle'),
    message: () =>
      draft.value === current
        ? t(all ? 'rankingMemberRoster.revokeHint' : 'rankingMemberRoster.confirmHint', {
            member: draftLabel.value,
            before: permissions(current.before),
            after: permissions(current.choices),
          })
        : '',
    ok: () => t(all ? 'rankingMemberRoster.revokeAll' : 'rankingMemberRoster.save'),
    focus: 'cancel',
    persistent: false,
  });
}
async function cancelConfirmation() {
  const opener = confirmOpener;
  confirmOpener = undefined;
  const started = epoch;
  await nextTick();
  if (started === epoch && opener?.isConnected) opener.focus();
}
async function save() {
  const current = draft.value;
  if (!current || !confirmOpener || !changed.value || !authorized.value || writing.value) return;
  if (props.blockWrite || loading.value || !user.user.isLoged) {
    void cancelConfirmation();
    return;
  }
  const started = epoch;
  writing.value = true;
  clearProjection();
  try {
    await roster.replaceCapabilities(props.rankingId, current.memberId, [...current.choices]);
    if (started !== epoch) return;
    notice.value = 'saved';
  } catch (error) {
    if (started !== epoch) return;
    const status = statusOf(error);
    if (status === 401) {
      reset();
      emit('sessionLost');
      return;
    }
    notice.value = status === 400 ? 'invalid' : 'unknown';
  }
  if (started !== epoch) return;
  // A successful write is a receipt, not proof of continuing authority or current permissions.
  await read();
  if (started === epoch) {
    writing.value = false;
    await nextTick();
    if (started === epoch) heading.value?.focus();
  }
}
</script>

<template>
  <section v-if="authorized" class="mm-member-roster" :aria-busy="loading || writing">
    <h2 ref="heading" tabindex="-1">{{ t('rankingMemberRoster.title') }}</h2>
    <p>{{ t('rankingMemberRoster.hint') }}</p>
    <button
      type="button"
      class="mm-button"
      :disabled="loading || writing || Boolean(draft)"
      :aria-expanded="expanded"
      @click="toggle"
    >
      {{ t(expanded ? 'rankingMemberRoster.close' : 'rankingMemberRoster.open') }}
    </button>
    <p v-if="notice" :role="notice === 'saved' ? 'status' : 'alert'">
      {{ t(`rankingMemberRoster.${notice}`) }}
    </p>
    <div v-if="expanded">
      <p v-if="loading" role="status">{{ t('rankingMemberRoster.loading') }}</p>
      <div v-else-if="loadError" role="alert">
        <p>{{ t('rankingMemberRoster.loadError') }}</p>
        <button type="button" class="mm-button" :disabled="writing" @click="read()">
          {{ t('rankingMemberRoster.retry') }}
        </button>
      </div>
      <p v-else-if="!members.length && !writing">{{ t('rankingMemberRoster.empty') }}</p>
      <ul v-if="members.length" class="mm-roster-members">
        <li v-for="(member, index) in members" :key="member.membership_id">
          <h3>{{ label(member, index) }}</h3>
          <p>{{ t('rankingMemberRoster.current') }}: {{ permissions(member.capabilities) }}</p>
          <button
            type="button"
            class="mm-button"
            :aria-label="
              t('rankingMemberRoster.editNamed', {
                member: label(member, index),
                number: index + 1,
              })
            "
            :disabled="blockWrite || loading || writing || Boolean(draft)"
            @click="edit(member, index, $event)"
          >
            {{ t('rankingMemberRoster.edit') }}
          </button>
          <form v-if="draft?.memberId === member.membership_id" @submit.prevent>
            <fieldset :disabled="writing">
              <legend>{{ t('rankingMemberRoster.editTitle', { member: draftLabel }) }}</legend>
              <label v-for="capability in ROSTER_CAPABILITIES" :key="capability">
                <input
                  type="checkbox"
                  :checked="draft.choices.includes(capability)"
                  @change="setCapability(capability, ($event.target as HTMLInputElement).checked)"
                />
                {{ t(`rankingMemberRoster.capabilities.${capability}`) }}
              </label>
            </fieldset>
            <p>{{ t('rankingMemberRoster.ownerOnlyHint') }}</p>
            <div class="mm-roster-actions">
              <button type="button" class="mm-button" @click="leaveEditor">
                {{ t('rankingMemberRoster.cancel') }}
              </button>
              <button
                type="button"
                class="mm-button mm-button-primary"
                :disabled="blockWrite || !changed"
                @click="confirm"
              >
                {{ t('rankingMemberRoster.review') }}
              </button>
            </div>
          </form>
        </li>
      </ul>
      <button
        v-if="cursor"
        type="button"
        class="mm-button"
        :disabled="loading || writing || Boolean(draft)"
        @click="read(true)"
      >
        {{ t('rankingMemberRoster.more') }}
      </button>
    </div>
    <BaseConfirmDialog :key="dialogEpoch" ref="dialog" @cancel="cancelConfirmation" @ok="save" />
  </section>
</template>

<style scoped>
.mm-member-roster {
  min-width: 0;
  overflow-wrap: anywhere;
  margin-block: 16px;
  padding: 16px;
  background: var(--mm-surface);
  border: 1px solid var(--mm-border);
  border-radius: 16px;
}
.mm-member-roster h2,
.mm-member-roster h3 {
  margin-top: 0;
}
.mm-roster-members {
  list-style: none;
  padding: 0;
}
.mm-roster-members li {
  border-top: 1px solid var(--mm-border);
  padding-block: 14px;
}
.mm-roster-members form {
  margin-block: 12px;
}
.mm-roster-members fieldset {
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--mm-border);
  border-radius: 8px;
}
.mm-roster-members label {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
}
.mm-roster-members input {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
}
.mm-roster-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
