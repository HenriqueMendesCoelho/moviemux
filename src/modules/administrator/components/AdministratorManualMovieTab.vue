<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, useId, watch } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { useI18n } from 'vue-i18n';
import BaseConfirmDialog from '~/core/components/BaseConfirmDialog.vue';
import BaseMultiSelect from '~/core/components/BaseMultiSelect.vue';
import { useUserStore } from '~/core/stores/UserStore';
import movies from '~/modules/movie/services/MovieService';
import manual, {
  ManualCatalogError,
  normalizeManualCatalogInput,
  type ManualCatalogCreateInput,
} from '~/modules/movie/services/ManualCatalogService';

const props = defineProps<{ active: boolean }>();
const emit = defineEmits<{ available: [value: boolean]; select: []; locked: [value: boolean] }>();
const user = useUserStore();
const { t, te } = useI18n();
const permission = computed(() => user.user.isLoged && user.isAdmin);
const title = ref<HTMLElement>();
const message = ref<HTMLElement>();
const leaveDialog = ref<InstanceType<typeof BaseConfirmDialog>>();
const key = useId();
const titleFields = ['portuguese_title', 'english_title', 'original_title'] as const;
const blank = () => ({
  portuguese_title: '',
  english_title: '',
  original_title: '',
  director: '',
  description: '',
  release_date: '',
  runtime: '',
  genre_ids: [] as number[],
});
const draft = ref(blank());
const proved = ref(false);
const proving = ref(false);
const proofFailure = ref(false);
const saving = ref(false);
const genreLoading = ref(false);
const genreUnavailable = ref(false);
const genres = ref<{ id: number; name: string; tmdb_id?: number }[]>([]);
const feedback = ref('');
const pendingCommand = shallowRef<ManualCatalogCreateInput>();
const conflict = ref(false);
const selectableGenres = computed(() =>
  genres.value.map((genre) => {
    const label = `catalog.genre.${genre.tmdb_id ?? 0}`;
    return { value: genre.id, label: genre.tmdb_id && te(label) ? t(label) : genre.name };
  }),
);
let epoch = 0;
let genreEpoch = 0;
let mounted = false;
let request: AbortController | undefined;
let routeDecision: ((allowed: boolean) => void) | undefined;
function settleLeave(allowed: boolean) {
  routeDecision?.(allowed);
  routeDecision = undefined;
}
function reset() {
  epoch++;
  genreEpoch++;
  request?.abort();
  proved.value = false;
  proving.value = false;
  proofFailure.value = false;
  saving.value = false;
  genreLoading.value = false;
  genreUnavailable.value = false;
  genres.value = [];
  feedback.value = '';
  pendingCommand.value = undefined;
  conflict.value = false;
  draft.value = blank();
  settleLeave(false);
  emit('available', false);
}
function errorStatus(error: unknown) {
  return error instanceof ManualCatalogError ? error.status : undefined;
}
async function loadGenres() {
  if (!proved.value || !props.active || genreLoading.value) return;
  const started = epoch;
  const requested = ++genreEpoch;
  genreLoading.value = true;
  genreUnavailable.value = false;
  try {
    const rows = await movies.getMoviesGenres();
    if (started !== epoch || requested !== genreEpoch) return;
    const unique = new Map<number, (typeof genres.value)[number]>();
    for (const row of rows) {
      if (
        Number.isSafeInteger(row.id) &&
        row.id > 0 &&
        typeof row.name === 'string' &&
        row.name.trim()
      )
        unique.set(row.id, { id: row.id, name: row.name, tmdb_id: row.tmdb_id });
    }
    genres.value = [...unique.values()];
  } catch {
    if (started === epoch && requested === genreEpoch) genreUnavailable.value = true;
  } finally {
    if (started === epoch && requested === genreEpoch) genreLoading.value = false;
  }
}
async function verify() {
  if (!permission.value || saving.value) return;
  const started = epoch;
  const next = new AbortController();
  request?.abort();
  request = next;
  proved.value = false;
  proving.value = true;
  proofFailure.value = false;
  const valid = () => started === epoch && !next.signal.aborted && permission.value;
  try {
    await manual.proof(next.signal);
    if (!valid()) return;
    proved.value = true;
    emit('available', true);
    if (props.active && !genres.value.length) void loadGenres();
    if (props.active) {
      await nextTick();
      if (valid() && props.active) title.value?.focus();
    }
  } catch (error) {
    if (valid()) {
      const status = errorStatus(error);
      if (status === 401 || status === 403) reset();
      else {
        proofFailure.value = status !== 404;
        emit('available', false);
      }
    }
  } finally {
    if (valid()) proving.value = false;
  }
}
watch(
  [permission, () => user.user.generation, () => user.user.id],
  () => {
    reset();
    if (mounted && permission.value) void verify();
  },
  { flush: 'sync' },
);
watch(
  () => props.active,
  (active) => {
    if (active && mounted && permission.value && !saving.value) void verify();
  },
);
onMounted(() => {
  mounted = true;
  if (permission.value) void verify();
});
onBeforeUnmount(() => {
  mounted = false;
  reset();
});

const formDisabled = computed(() => saving.value || Boolean(pendingCommand.value));
watch(
  () => saving.value || (Boolean(pendingCommand.value) && !conflict.value),
  (value) => emit('locked', value),
  { flush: 'sync' },
);
function currentInput(commandId: string): ManualCatalogCreateInput | null {
  const { runtime, genre_ids, ...text } = draft.value;
  if (
    (runtime && !/^[0-9]{1,3}$/.test(runtime)) ||
    genre_ids.some((id) => !genres.value.some((genre) => genre.id === id))
  )
    return null;
  return (
    normalizeManualCatalogInput({
      command_id: commandId,
      ...Object.fromEntries(Object.entries(text).filter(([, value]) => value.trim())),
      ...(runtime ? { runtime: Number(runtime) } : {}),
      ...(genre_ids.length ? { genre_ids: [...genre_ids] } : {}),
    }) ?? null
  );
}
async function focusFeedback() {
  await nextTick();
  if (props.active) message.value?.focus();
}
async function write(command: ManualCatalogCreateInput) {
  if (!props.active || !proved.value || !permission.value || saving.value || conflict.value) return;
  const started = epoch;
  pendingCommand.value = command;
  saving.value = true;
  feedback.value = '';
  try {
    await manual.create(command);
    if (started !== epoch) return;
    pendingCommand.value = undefined;
    draft.value = blank();
    feedback.value = 'saved';
  } catch (error) {
    if (started !== epoch) return;
    const status = errorStatus(error);
    if (status === 401 || status === 403) {
      reset();
      return;
    }
    const code = error instanceof ManualCatalogError ? error.code : undefined;
    if (status === 400 && code === 'catalog.invalid_manual_movie') {
      pendingCommand.value = undefined;
      feedback.value = 'invalid';
    } else if (status === 409 && code === 'catalog.manual_command_conflict') {
      conflict.value = true;
      feedback.value = 'conflict';
    } else {
      feedback.value = 'uncertain';
    }
  } finally {
    if (started === epoch) {
      saving.value = false;
      await focusFeedback();
    }
  }
}
function submit() {
  if (!props.active || !proved.value || !permission.value || formDisabled.value) return;
  const commandId = globalThis.crypto?.randomUUID?.();
  if (!commandId) {
    feedback.value = 'environment';
    void focusFeedback();
    return;
  }
  const body = currentInput(commandId);
  if (!body) {
    feedback.value = 'invalid';
    void focusFeedback();
    return;
  }
  void write(body);
}
function retry() {
  const command = pendingCommand.value;
  if (command && !conflict.value) void write(command);
}
onBeforeRouteLeave(async () => {
  if (!permission.value) return true;
  if (!saving.value && !pendingCommand.value) return true;
  emit('select');
  await nextTick();
  if (!permission.value || (!saving.value && !pendingCommand.value)) return true;
  if (saving.value) return false;
  if (routeDecision || !leaveDialog.value) return false;
  const decision = new Promise<boolean>((resolve) => {
    routeDecision = resolve;
  });
  void leaveDialog.value.show({
    title: () => t('manualCatalog.leaveTitle'),
    message: () => t('manualCatalog.leaveHint'),
    ok: () => t('manualCatalog.leave'),
    cancel: () => t('manualCatalog.stay'),
    focus: 'cancel',
    persistent: false,
  });
  return decision;
});
</script>

<template>
  <div v-if="permission && proofFailure && !active" class="mm-manual-proof">
    <p role="alert">{{ t('manualCatalog.proofError') }}</p>
    <button type="button" class="mm-button" @click="verify">
      {{ t('manualCatalog.retryProof') }}
    </button>
  </div>
  <section v-if="active && permission" class="mm-manual-catalog" :aria-busy="proving || saving">
    <p v-if="proving && !proved" role="status">{{ t('manualCatalog.authorizing') }}</p>
    <template v-if="proved">
      <h2 ref="title" tabindex="-1">{{ t('manualCatalog.title') }}</h2>
      <p>{{ t('manualCatalog.intro') }}</p>
      <p>{{ t('manualCatalog.titleHint') }}</p>
      <form novalidate @submit.prevent="submit">
        <fieldset :disabled="formDisabled" class="mm-manual-fields">
          <label v-for="field in titleFields" :key="field" :for="`${key}-${field}`">
            {{ t(`manualCatalog.fields.${field}`) }}
            <input
              :id="`${key}-${field}`"
              v-model="draft[field]"
              type="text"
              autocomplete="off"
              maxlength="300"
            />
          </label>
          <label :for="`${key}-director`">
            {{ t('manualCatalog.fields.director') }}
            <input
              :id="`${key}-director`"
              v-model="draft.director"
              type="text"
              autocomplete="off"
              maxlength="300"
            />
          </label>
          <label :for="`${key}-release`">
            {{ t('manualCatalog.fields.release_date') }}
            <input :id="`${key}-release`" v-model="draft.release_date" type="date" />
          </label>
          <label :for="`${key}-runtime`">
            {{ t('manualCatalog.fields.runtime') }}
            <input
              :id="`${key}-runtime`"
              v-model="draft.runtime"
              type="text"
              inputmode="numeric"
              maxlength="3"
            />
          </label>
          <label :for="`${key}-description`" class="mm-manual-wide">
            {{ t('manualCatalog.fields.description') }}
            <textarea
              :id="`${key}-description`"
              v-model="draft.description"
              rows="4"
              maxlength="8000"
            />
          </label>
          <div class="mm-manual-wide">
            <BaseMultiSelect
              v-model="draft.genre_ids"
              :label="t('manualCatalog.fields.genres')"
              :placeholder="t('manualCatalog.noGenres')"
              :empty-selection-text="t('manualCatalog.noGenres')"
              :options="selectableGenres"
              :disabled="formDisabled"
              :loading="genreLoading"
              :error="genreUnavailable ? t('manualCatalog.genresUnavailable') : ''"
              @retry="loadGenres"
            />
          </div>
        </fieldset>
        <button type="submit" class="mm-button mm-button-primary" :disabled="formDisabled">
          {{ t('manualCatalog.submit') }}
        </button>
      </form>
      <p v-if="saving" role="status">{{ t('manualCatalog.saving') }}</p>
      <p
        v-if="feedback"
        ref="message"
        tabindex="-1"
        :role="feedback === 'saved' ? 'status' : 'alert'"
      >
        {{ t(`manualCatalog.${feedback}`) }}
      </p>
      <button
        v-if="pendingCommand && !conflict && !saving"
        type="button"
        class="mm-button"
        @click="retry"
      >
        {{ t('manualCatalog.retry') }}
      </button>
    </template>
    <BaseConfirmDialog ref="leaveDialog" @ok="settleLeave(true)" @cancel="settleLeave(false)" />
  </section>
</template>

<style scoped>
.mm-manual-catalog {
  min-width: 0;
  overflow-wrap: anywhere;
}
.mm-manual-proof {
  margin-block-start: 16px;
}
.mm-manual-catalog h2 {
  margin-top: 0;
}
.mm-manual-fields {
  min-width: 0;
  border: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-block: 16px;
}
.mm-manual-fields label {
  display: grid;
  gap: 6px;
  min-width: 0;
}
.mm-manual-fields input,
.mm-manual-fields textarea {
  width: 100%;
  min-width: 0;
  max-width: 100%;
}
.mm-manual-wide {
  grid-column: 1 / -1;
  min-width: 0;
}
@media (max-width: 640px) {
  .mm-manual-fields {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
