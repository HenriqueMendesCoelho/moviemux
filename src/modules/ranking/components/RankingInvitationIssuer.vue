<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useUserStore } from '~/core/stores/UserStore';
import { isInvitationAddress } from '../services/RankingInvitationService';
import issuer, { type IssuedInvitation } from '../services/RankingInvitationIssuerService';

const props = defineProps<{ rankingId: string; canInvite: boolean }>();
const emit = defineEmits<{ accessLost: [status: number] }>();
const user = useUserStore();
const { t, locale } = useI18n();
const titleId = useId(),
  fieldId = useId(),
  hintId = useId(),
  resultId = useId();
const open = ref(false);
const recipient = ref('');
const feedback = ref('');
const pending = ref(false);
const uncertain = ref(false);
const scopeBlocked = ref(false);
const receipt = ref<IssuedInvitation | null>(null);
const confirming = ref(false);
const field = ref<HTMLInputElement>();
const opener = ref<HTMLButtonElement>();
const revokeButton = ref<HTMLButtonElement>();
const revokeCancel = ref<HTMLButtonElement>();
let epoch = 0;
function reset() {
  epoch++;
  open.value = false;
  recipient.value = '';
  feedback.value = '';
  pending.value = false;
  uncertain.value = false;
  scopeBlocked.value = false;
  receipt.value = null;
  confirming.value = false;
}
watch(() => [props.rankingId, props.canInvite, user.user.generation, user.user.isLoged], reset, {
  flush: 'sync',
});
onBeforeUnmount(reset);
function allowed() {
  return props.canInvite && user.user.isLoged && !scopeBlocked.value;
}
async function show() {
  if (!allowed() || pending.value || uncertain.value) return;
  open.value = true;
  receipt.value = null;
  feedback.value = '';
  await nextTick();
  if (open.value) field.value?.focus();
}
async function close() {
  if (pending.value) return;
  open.value = false;
  recipient.value = '';
  feedback.value = '';
  receipt.value = null;
  confirming.value = false;
  await nextTick();
  opener.value?.focus();
}
function failure(error: unknown) {
  const r = (error as { response?: { status?: number; data?: { data?: { code?: string } } } })
    ?.response;
  return { status: r?.status, code: r?.data?.data?.code };
}
function loseAccess(status: number) {
  scopeBlocked.value = true;
  open.value = false;
  receipt.value = null;
  feedback.value = status === 401 ? 'signIn' : 'unavailable';
  emit('accessLost', status);
}
async function submit() {
  if (!allowed() || !open.value || pending.value || uncertain.value || receipt.value) return;
  if (!isInvitationAddress(recipient.value)) {
    feedback.value = 'invalid';
    field.value?.focus();
    return;
  }
  const started = epoch;
  feedback.value = '';
  pending.value = true;
  try {
    const request = issuer.issue(props.rankingId, recipient.value);
    recipient.value = '';
    const result = await request;
    if (started !== epoch) return;
    receipt.value = result;
    feedback.value = 'sent';
  } catch (error) {
    if (started !== epoch) return;
    recipient.value = '';
    const { status, code } = failure(error);
    if (status === 400 && code === 'ranking.invalid_invitation') feedback.value = 'invalid';
    else if (status === 404 || status === 403 || status === 401) loseAccess(status);
    else if (status === 409 && code === 'ranking.invitation_exists') feedback.value = 'duplicate';
    else if (status === 503 && code === 'ranking.invitation_address_unavailable')
      feedback.value = 'serviceUnavailable';
    else if (status === 429) feedback.value = 'retryLater';
    else {
      feedback.value = 'issueUncertain';
      uncertain.value = true;
      open.value = false;
    }
  } finally {
    if (started === epoch) {
      pending.value = false;
      await nextTick();
      if (started === epoch && open.value)
        (receipt.value ? revokeButton.value : field.value)?.focus();
    }
  }
}
async function askRevoke() {
  if (!allowed() || pending.value || !receipt.value) return;
  confirming.value = true;
  await nextTick();
  if (confirming.value) revokeCancel.value?.focus();
}
async function cancelRevoke() {
  confirming.value = false;
  await nextTick();
  revokeButton.value?.focus();
}
async function revoke() {
  if (!allowed() || pending.value || !receipt.value || !confirming.value) return;
  const started = epoch,
    inviteId = receipt.value.invite_id;
  pending.value = true;
  confirming.value = false;
  feedback.value = '';
  try {
    await issuer.revoke(props.rankingId, inviteId);
    if (started !== epoch) return;
    receipt.value = null;
    open.value = false;
    feedback.value = 'revoked';
  } catch (error) {
    if (started !== epoch) return;
    const { status } = failure(error);
    receipt.value = null;
    open.value = false;
    if (status === 404 || status === 403 || status === 401) loseAccess(status);
    else {
      feedback.value = 'revokeUncertain';
      uncertain.value = true;
    }
  } finally {
    if (started === epoch) pending.value = false;
  }
}
function expires(raw: string) {
  return new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(raw),
  );
}
</script>
<template>
  <section
    v-if="canInvite && user.user.isLoged"
    class="mm-ranking-issuer"
    :aria-labelledby="titleId"
    :aria-busy="pending"
  >
    <h2 :id="titleId">{{ t('rankingInvitationIssuer.title') }}</h2>
    <button
      v-if="!open && !uncertain && !scopeBlocked"
      ref="opener"
      type="button"
      class="mm-button"
      @click="show"
    >
      {{ t('rankingInvitationIssuer.open') }}
    </button>
    <form
      v-if="open && !receipt && !uncertain && !pending"
      class="mm-issuer-form"
      autocomplete="off"
      novalidate
      @submit.prevent="submit"
      @keydown.esc.prevent.stop="close"
    >
      <label :for="fieldId">{{ t('rankingInvitationIssuer.code') }}</label>
      <p :id="hintId">{{ t('rankingInvitationIssuer.hint') }}</p>
      <input
        :id="fieldId"
        ref="field"
        v-model="recipient"
        class="mm-issuer-input"
        type="text"
        autocomplete="off"
        spellcheck="false"
        autocapitalize="none"
        translate="no"
        dir="ltr"
        :disabled="pending"
        :aria-invalid="feedback === 'invalid'"
        :aria-describedby="feedback === 'invalid' ? `${hintId} ${resultId}` : hintId"
      />
      <div class="mm-issuer-actions">
        <button type="submit" class="mm-button mm-button-primary" :disabled="pending">
          {{ t('rankingInvitationIssuer.send') }}
        </button>
        <button type="button" class="mm-button" :disabled="pending" @click="close">
          {{ t('rankingInvitationIssuer.cancel') }}
        </button>
      </div>
    </form>
    <div v-if="receipt" class="mm-issuer-receipt">
      <p>
        {{ t('rankingInvitationIssuer.expires') }}
        <time :datetime="receipt.expires_at">{{ expires(receipt.expires_at) }}</time>
      </p>
      <div v-if="!confirming" class="mm-issuer-actions">
        <button
          ref="revokeButton"
          type="button"
          class="mm-button"
          :disabled="pending"
          @click="askRevoke"
        >
          {{ t('rankingInvitationIssuer.revoke') }}
        </button>
        <button type="button" class="mm-button" :disabled="pending" @click="close">
          {{ t('rankingInvitationIssuer.close') }}
        </button>
      </div>
      <div v-else @keydown.esc.prevent.stop="cancelRevoke">
        <p>{{ t('rankingInvitationIssuer.revokeWarning') }}</p>
        <div class="mm-issuer-actions">
          <button ref="revokeCancel" type="button" class="mm-button" @click="cancelRevoke">
            {{ t('rankingInvitationIssuer.cancel') }}
          </button>
          <button type="button" class="mm-button mm-button-primary" @click="revoke">
            {{ t('rankingInvitationIssuer.confirmRevoke') }}
          </button>
        </div>
      </div>
    </div>
    <p v-if="pending" role="status">{{ t('rankingInvitationIssuer.working') }}</p>
    <p
      v-else-if="feedback"
      :id="resultId"
      :role="feedback === 'sent' || feedback === 'revoked' ? 'status' : 'alert'"
    >
      {{ t(`rankingInvitationIssuer.${feedback}`) }}
    </p>
  </section>
</template>
<style scoped>
.mm-ranking-issuer {
  min-width: 0;
  border: 1px solid var(--mm-border);
  border-radius: 16px;
  padding: 16px;
  background: var(--mm-surface);
  overflow-wrap: anywhere;
}
.mm-ranking-issuer h2 {
  margin-top: 0;
}
.mm-issuer-form {
  display: grid;
  gap: 10px;
}
.mm-issuer-form p {
  margin: 0;
}
.mm-issuer-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.mm-issuer-input {
  width: min(100%, 24rem);
  min-width: 0;
  min-height: 44px;
  padding: 8px 12px;
  border: 1px solid var(--mm-border);
  border-radius: 10px;
  background: var(--mm-surface);
  color: var(--mm-text);
  font-family: monospace;
}
.mm-issuer-input:focus-visible {
  outline: 2px solid var(--mm-focus-ring);
  outline-offset: 2px;
}
</style>
