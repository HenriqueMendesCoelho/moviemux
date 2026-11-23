<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import BaseConfirmDialog from '~/core/components/BaseConfirmDialog.vue';
import { useUserStore } from '~/core/stores/UserStore';
import service, { type CollectionVisibility } from '../services/RankingVisibilityService';

const props = defineProps<{ rankingId: string; blockWrite?: boolean }>();
const emit = defineEmits<{
  settings: [value: CollectionVisibility | null];
  scopeLost: [status: number];
  interaction: [state: 'idle' | 'draft' | 'pending' | 'uncertain'];
}>();
const { t } = useI18n();
const user = useUserStore();
const dialog = ref<InstanceType<typeof BaseConfirmDialog>>();
const scopeEpoch = ref(0);
const knownOwner = ref(false);
const current = ref<CollectionVisibility | null>(null);
const draft = ref<CollectionVisibility | null>(null);
const unknownTarget = ref<CollectionVisibility | null>(null);
const checking = ref(false);
const writing = ref(false);
const feedback = ref<'saved' | 'unknown' | 'unverified' | 'verified' | 'different' | ''>('');

const interaction = computed(() => {
  if (writing.value) return 'pending';
  if (unknownTarget.value !== null) return 'uncertain';
  if (draft.value !== null) return 'draft';
  return 'idle';
});
watch(interaction, (state) => emit('interaction', state), { flush: 'sync' });

let mounted = false;
let readRequest: AbortController | undefined;
function authority(value: CollectionVisibility | null) {
  current.value = value;
  emit('settings', value);
}
function reset() {
  scopeEpoch.value++;
  readRequest?.abort();
  authority(null);
  knownOwner.value = false;
  draft.value = null;
  unknownTarget.value = null;
  writing.value = false;
  checking.value = false;
  feedback.value = '';
}
function lose(status: number) {
  const owned = knownOwner.value;
  reset();
  if (owned) emit('scopeLost', status);
}
function httpStatus(error: unknown) {
  return (error as { response?: { status?: number } } | undefined)?.response?.status;
}
watch(
  [() => props.rankingId, () => user.user.generation, () => user.user.isLoged],
  () => {
    reset();
    if (mounted) void read();
  },
  { flush: 'sync' },
);
onMounted(() => {
  mounted = true;
  void read();
});
onBeforeUnmount(() => {
  mounted = false;
  reset();
});

async function read() {
  if (!user.user.isLoged || writing.value || checking.value || draft.value !== null) return;
  const epoch = scopeEpoch.value;
  const intended = unknownTarget.value;
  readRequest = new AbortController();
  checking.value = true;
  try {
    const value = await service.settings(props.rankingId, readRequest.signal);
    if (epoch !== scopeEpoch.value) return;
    knownOwner.value = true;
    authority(value);
    unknownTarget.value = null;
    feedback.value = intended === null ? '' : value === intended ? 'verified' : 'different';
  } catch (error) {
    if (epoch !== scopeEpoch.value) return;
    const status = httpStatus(error);
    if (status === 401 || status === 403 || status === 404) lose(status);
    else if (intended !== null) feedback.value = 'unverified';
  } finally {
    if (epoch === scopeEpoch.value) checking.value = false;
  }
}
function openConfirmation() {
  if (
    !dialog.value ||
    !knownOwner.value ||
    current.value === null ||
    draft.value !== null ||
    props.blockWrite ||
    checking.value ||
    writing.value ||
    unknownTarget.value !== null ||
    !user.user.isLoged
  )
    return;
  const target = current.value === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC';
  draft.value = target;
  feedback.value = '';
  void dialog.value.show({
    title: () =>
      t(target === 'PUBLIC' ? 'rankingVisibility.makePublic' : 'rankingVisibility.makePrivate'),
    message: () =>
      t(
        target === 'PUBLIC'
          ? 'rankingVisibility.publicDisclosure'
          : 'rankingVisibility.privateDisclosure',
      ),
    ok: () => t('rankingVisibility.confirmSave'),
    focus: 'cancel',
    persistent: false,
  });
}
function cancel() {
  draft.value = null;
}
async function save() {
  const target = draft.value;
  if (!target || !knownOwner.value || current.value === null || writing.value || checking.value)
    return;
  if (props.blockWrite || !user.user.isLoged) {
    cancel();
    return;
  }
  const epoch = scopeEpoch.value;
  writing.value = true;
  cancel();
  try {
    const value = await service.save(props.rankingId, target);
    if (epoch !== scopeEpoch.value) return;
    authority(value);
    feedback.value = 'saved';
  } catch (error) {
    if (epoch !== scopeEpoch.value) return;
    const status = httpStatus(error);
    if (status === 401 || status === 403 || status === 404) lose(status);
    else {
      authority(null);
      unknownTarget.value = target;
      feedback.value = 'unknown';
    }
  } finally {
    if (epoch === scopeEpoch.value) writing.value = false;
  }
}
</script>
<template>
  <section v-if="knownOwner" class="mm-visibility-settings" :aria-busy="writing || checking">
    <h2>{{ t('rankingVisibility.title') }}</h2>
    <p>{{ t('rankingVisibility.hint') }}</p>
    <template v-if="current !== null">
      <p>
        {{ t(current === 'PUBLIC' ? 'rankingVisibility.public' : 'rankingVisibility.private') }}
      </p>
      <button
        type="button"
        class="mm-button"
        :disabled="blockWrite || writing || checking"
        @click="openConfirmation"
      >
        {{
          t(current === 'PUBLIC' ? 'rankingVisibility.makePrivate' : 'rankingVisibility.makePublic')
        }}
      </button>
      <BaseConfirmDialog :key="scopeEpoch" ref="dialog" @ok="save" @cancel="cancel" />
    </template>
    <p
      v-if="feedback"
      :role="feedback === 'unknown' || feedback === 'unverified' ? 'alert' : 'status'"
    >
      {{ t(`rankingVisibility.${feedback}`) }}
    </p>
    <button
      v-if="unknownTarget !== null"
      type="button"
      class="mm-button"
      :disabled="checking || writing"
      @click="read"
    >
      {{ t('rankingVisibility.check') }}
    </button>
  </section>
</template>
<style scoped>
.mm-visibility-settings {
  min-width: 0;
  overflow-wrap: anywhere;
  padding: 16px;
  border: 1px solid var(--mm-border);
  border-radius: 16px;
  background: var(--mm-surface);
}
.mm-visibility-settings h2 {
  margin-top: 0;
}
</style>
