<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useUserStore } from '~/core/stores/UserStore';
import invitation from '../services/RankingInvitationService';

const { t } = useI18n();
const user = useUserStore();
const titleId = useId();
const confirmationId = useId();
const visible = ref(false);
const loaded = ref(false);
const code = ref<string | null>(null);
const reading = ref(false);
const writing = ref(false);
const confirming = ref(false);
const copying = ref(false);
const feedback = ref('');
const revealButton = ref<HTMLButtonElement>();
const rotateButton = ref<HTMLButtonElement>();
const cancelButton = ref<HTMLButtonElement>();
const hideButton = ref<HTMLButtonElement>();
let epoch = 0;
let writeEpoch = 0;
let controller: AbortController | undefined;

function hide(focus = false) {
  epoch++;
  controller?.abort();
  visible.value = false;
  loaded.value = false;
  code.value = null;
  reading.value = false;
  confirming.value = false;
  copying.value = false;
  feedback.value = '';
  if (focus) void nextTick(() => revealButton.value?.focus());
}
watch(
  [() => user.user.generation, () => user.user.isLoged],
  () => {
    writeEpoch++;
    writing.value = false;
    hide();
  },
  { flush: 'sync' },
);
onBeforeUnmount(() => {
  writeEpoch++;
  hide();
});

async function reveal() {
  if (!user.user.isLoged || reading.value || writing.value) return;
  const started = ++epoch;
  controller = new AbortController();
  visible.value = true;
  loaded.value = false;
  code.value = null;
  reading.value = true;
  confirming.value = false;
  feedback.value = '';
  void nextTick(() => {
    if (started === epoch) hideButton.value?.focus();
  });
  try {
    const result = await invitation.readAddress(controller.signal);
    if (started === epoch) {
      code.value = result;
      loaded.value = true;
    }
  } catch {
    if (started === epoch) feedback.value = 'loadError';
  } finally {
    if (started === epoch) reading.value = false;
  }
}

async function askToRotate() {
  if (code.value === null || writing.value || copying.value) return;
  confirming.value = true;
  feedback.value = '';
  await nextTick();
  if (confirming.value) cancelButton.value?.focus();
}
async function cancelRotation() {
  confirming.value = false;
  await nextTick();
  rotateButton.value?.focus();
}

async function rotate() {
  if (!user.user.isLoged || !visible.value || !loaded.value || writing.value || copying.value)
    return;
  if (code.value !== null && !confirming.value) return;
  const started = ++epoch;
  const operation = ++writeEpoch;
  writing.value = true;
  // Do not leave the old address exposed when the effective value is unknown.
  code.value = null;
  loaded.value = false;
  confirming.value = false;
  feedback.value = '';
  try {
    const result = await invitation.rotateAddress();
    if (started === epoch) {
      code.value = result;
      loaded.value = true;
      feedback.value = 'updated';
    }
  } catch {
    // Reconciliation is an explicit GET, never another blind POST.
    if (started === epoch) feedback.value = 'uncertain';
  } finally {
    if (operation === writeEpoch) writing.value = false;
    if (started === epoch) void nextTick(() => hideButton.value?.focus());
  }
}

async function copy() {
  if (!visible.value || code.value === null || copying.value || writing.value || confirming.value)
    return;
  const started = epoch;
  copying.value = true;
  feedback.value = '';
  try {
    await navigator.clipboard.writeText(code.value);
    if (started === epoch) feedback.value = 'copied';
  } catch {
    if (started === epoch) feedback.value = 'copyError';
  } finally {
    if (started === epoch) copying.value = false;
  }
}
</script>

<template>
  <section v-if="user.user.isLoged" class="mm-invitation-address" :aria-labelledby="titleId">
    <h2 :id="titleId">{{ t('rankingInvitationAddress.title') }}</h2>
    <p>{{ t('rankingInvitationAddress.description') }}</p>
    <button
      v-if="!visible"
      ref="revealButton"
      type="button"
      class="mm-button"
      :disabled="writing"
      @click="reveal"
    >
      {{ t('rankingInvitationAddress.reveal') }}
    </button>
    <template v-else>
      <button ref="hideButton" type="button" class="mm-button" @click="hide(true)">
        {{ t('rankingInvitationAddress.hide') }}
      </button>
      <template v-if="loaded && code !== null">
        <p>
          <code class="mm-invitation-code" translate="no" dir="ltr">{{ code }}</code>
        </p>
        <div v-if="!confirming" class="mm-invitation-actions">
          <button type="button" class="mm-button" :disabled="copying" @click="copy">
            {{ t('rankingInvitationAddress.copy') }}
          </button>
          <button
            ref="rotateButton"
            type="button"
            class="mm-button"
            :disabled="copying"
            @click="askToRotate"
          >
            {{ t('rankingInvitationAddress.rotate') }}
          </button>
        </div>
        <div
          v-else
          :aria-labelledby="confirmationId"
          role="group"
          @keydown.esc.prevent.stop="cancelRotation"
        >
          <p :id="confirmationId">{{ t('rankingInvitationAddress.rotateWarning') }}</p>
          <div class="mm-invitation-actions">
            <button ref="cancelButton" type="button" class="mm-button" @click="cancelRotation">
              {{ t('rankingInvitationAddress.cancel') }}
            </button>
            <button type="button" class="mm-button mm-button-primary" @click="rotate">
              {{ t('rankingInvitationAddress.confirmRotate') }}
            </button>
          </div>
        </div>
      </template>
      <template v-else-if="loaded">
        <p>{{ t('rankingInvitationAddress.empty') }}</p>
        <button type="button" class="mm-button mm-button-primary" @click="rotate">
          {{ t('rankingInvitationAddress.generate') }}
        </button>
      </template>
      <button v-else-if="!reading && !writing" type="button" class="mm-button" @click="reveal">
        {{ t('rankingInvitationAddress.check') }}
      </button>
    </template>
    <p v-if="reading || writing || copying" role="status">
      {{ t('rankingInvitationAddress.working') }}
    </p>
    <p
      v-else-if="feedback"
      :role="feedback === 'copied' || feedback === 'updated' ? 'status' : 'alert'"
    >
      {{ t(`rankingInvitationAddress.${feedback}`) }}
    </p>
  </section>
</template>

<style scoped>
.mm-invitation-address {
  border: 1px solid var(--mm-border);
  border-radius: 16px;
  background: var(--mm-surface);
  padding: 16px;
  min-width: 0;
}
.mm-invitation-address h2 {
  margin-top: 0;
}
.mm-invitation-code {
  overflow-wrap: anywhere;
  user-select: all;
}
.mm-invitation-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
