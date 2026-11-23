<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useUserStore } from '~/core/stores/UserStore';
import service from '../services/RankingRepeatedRoundService';

const props = defineProps<{ rankingId: string; revision?: number; blockWrite?: boolean }>();
const emit = defineEmits<{
  settings: [value: boolean | null];
  scopeLost: [status: number];
  interaction: [state: 'idle' | 'pending' | 'uncertain'];
}>();
const { t } = useI18n();
const user = useUserStore();
const current = ref<boolean | null>(null);
const knownOwner = ref(false),
  writing = ref(false),
  checking = ref(false),
  uncertain = ref(false);
const feedback = ref('');
const interaction = computed(() =>
  writing.value ? 'pending' : uncertain.value ? 'uncertain' : 'idle',
);
let epoch = 0,
  mounted = false;
let request: AbortController | undefined;
watch(interaction, (state) => emit('interaction', state), { flush: 'sync' });
function authority(value: boolean | null) {
  current.value = value;
  emit('settings', value);
}
function reset() {
  epoch++;
  request?.abort();
  knownOwner.value = false;
  writing.value = false;
  checking.value = false;
  uncertain.value = false;
  feedback.value = '';
  authority(null);
}
watch(
  [() => props.rankingId, () => user.user.generation, () => user.user.isLoged],
  () => {
    reset();
    if (mounted) void read();
  },
  { flush: 'sync' },
);
watch(
  () => props.revision,
  () => {
    if (mounted) void read();
  },
);
onMounted(() => {
  mounted = true;
  void read();
});
onBeforeUnmount(() => {
  mounted = false;
  reset();
});
function status(e: unknown) {
  return (e as { response?: { status?: number } })?.response?.status;
}
async function read() {
  if (!user.user.isLoged || writing.value || checking.value) return;
  const started = epoch;
  request?.abort();
  request = new AbortController();
  checking.value = true;
  feedback.value = '';
  try {
    const value = await service.settings(props.rankingId, request.signal);
    if (started !== epoch) return;
    knownOwner.value = true;
    authority(value);
    uncertain.value = false;
  } catch (e) {
    if (started !== epoch) return;
    const code = status(e);
    authority(null);
    if (code === 401 || code === 403 || code === 404) {
      if (knownOwner.value) emit('scopeLost', code);
      knownOwner.value = false;
      uncertain.value = false;
    } else if (knownOwner.value) {
      uncertain.value = true;
      feedback.value = 'checkError';
    }
  } finally {
    if (started === epoch) checking.value = false;
  }
}
async function toggle() {
  if (
    props.blockWrite ||
    current.value === null ||
    !user.user.isLoged ||
    writing.value ||
    checking.value ||
    uncertain.value
  )
    return;
  const started = epoch,
    value = !current.value;
  writing.value = true;
  feedback.value = '';
  try {
    const stored = await service.setSettings(props.rankingId, value);
    if (started !== epoch) return;
    authority(stored);
    feedback.value = 'saved';
  } catch (e) {
    if (started !== epoch) return;
    authority(null);
    const code = status(e);
    if (code === 401 || code === 403 || code === 404) {
      knownOwner.value = false;
      emit('scopeLost', code);
    } else {
      uncertain.value = true;
      feedback.value = 'settingsUncertain';
    }
  } finally {
    if (started === epoch) writing.value = false;
  }
}
</script>
<template>
  <section v-if="knownOwner" class="mm-repeated-settings" :aria-busy="writing || checking">
    <h2>{{ t('rankingRepeatedRounds.settings') }}</h2>
    <p>{{ t('rankingRepeatedRounds.settingHint') }}</p>
    <template v-if="current !== null">
      <p>{{ t(current ? 'rankingRepeatedRounds.enabled' : 'rankingRepeatedRounds.disabled') }}</p>
      <button
        type="button"
        class="mm-button"
        :disabled="blockWrite || writing || checking || uncertain"
        @click="toggle"
      >
        {{ t(current ? 'rankingRepeatedRounds.turnOff' : 'rankingRepeatedRounds.turnOn') }}
      </button>
    </template>
    <p v-if="feedback" :role="feedback === 'saved' ? 'status' : 'alert'">
      {{ t(`rankingRepeatedRounds.${feedback}`) }}
    </p>
    <button
      v-if="uncertain"
      type="button"
      class="mm-button"
      :disabled="writing || checking"
      @click="read"
    >
      {{ t('rankingRepeatedRounds.checkSettings') }}
    </button>
  </section>
</template>
<style scoped>
.mm-repeated-settings {
  padding: 16px;
  border: 1px solid var(--mm-border);
  border-radius: 16px;
  background: var(--mm-surface);
  min-width: 0;
  overflow-wrap: anywhere;
}
.mm-repeated-settings h2 {
  margin-top: 0;
}
</style>
