<template>
  <section
    ref="reviewsRoot"
    class="mm-reviews"
    :aria-busy="loading"
    aria-labelledby="reviews-title"
  >
    <div class="mm-reviews-content">
      <header class="mm-review-header">
        <div class="mm-review-heading">
          <h2 id="reviews-title">
            Avaliações <span class="mm-review-count">{{ notes.length }}</span>
          </h2>
          <p>
            {{
              movie.show_notes && !privacyPending
                ? 'A opinião de quem assistiu.'
                : 'As notas dos outros ficam ocultas durante a votação.'
            }}
          </p>
        </div>
        <div class="mm-review-actions">
          <label v-if="canToggleVisibility" class="mm-visibility-toggle"
            ><input
              type="checkbox"
              role="switch"
              :checked="movie.show_notes"
              :disabled="loading"
              @change="updateShowNotes(($event.target as HTMLInputElement).checked)"
            /><span>Notas visíveis</span></label
          >
          <button
            v-if="privacyPending || !stateSocketMovie.connected"
            class="mm-review-icon"
            type="button"
            aria-label="Atualizar avaliações"
            title="Atualizar avaliações"
            :disabled="loading"
            @click="getMovieNotes"
          >
            <BaseIcon name="refresh" />
          </button>
          <button
            v-if="notes.length && !isUserAlreadyVoted"
            class="mm-button mm-button-primary"
            type="button"
            :disabled="loading"
            @click="openEditor()"
          >
            Avaliar filme
          </button>
        </div>
      </header>
      <div v-if="loading" class="mm-review-progress" role="status">
        <span aria-hidden="true" /><span class="mm-sr-only">Atualizando avaliações…</span>
      </div>
      <p v-if="notesError" class="mm-review-error" role="alert">
        {{ notesError }}
        <button type="button" class="mm-link" :disabled="loading" @click="getMovieNotes">
          Tentar novamente
        </button>
      </p>
      <div v-if="notes.length > 1" class="mm-review-controls">
        <label
          >Ordenar
          <select v-model="sort" aria-label="Ordenar avaliações">
            <option value="name">Nome A–Z</option>
            <option value="name-desc">Nome Z–A</option>
            <option value="note" :disabled="!canSortScores">
              {{ canSortScores ? 'Maior nota' : 'Maior nota — disponível após revelar' }}
            </option>
            <option value="updated">Mais recentes</option>
          </select></label
        >
        <label v-if="notes.length > 5"
          >Por página
          <select v-model.number="pageSize">
            <option :value="5">5</option>
            <option :value="10">10</option>
          </select></label
        >
      </div>
      <div v-if="!notes.length && loading" class="mm-review-skeleton" aria-hidden="true">
        <div v-for="n in 2" :key="n"><i /><span /><b /></div>
      </div>
      <div v-else-if="!notes.length && !notesError" class="mm-review-empty">
        <div class="mm-empty-symbol" aria-hidden="true">☆</div>
        <div>
          <h3>A primeira opinião pode ser sua</h3>
          <p>Avalie de 0 a 10 e comece a conversa sobre este filme.</p>
        </div>
        <button
          class="mm-button mm-button-primary"
          type="button"
          :disabled="loading"
          @click="openEditor()"
        >
          Avaliar filme
        </button>
      </div>
      <table v-else-if="notes.length" class="mm-rating-table">
        <caption class="mm-sr-only">
          Avaliações dos participantes
        </caption>
        <thead>
          <tr>
            <th>Pessoa</th>
            <th>Nota</th>
            <th><span class="mm-sr-only">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="note in visibleNotes"
            :key="note.user.id"
            :class="{ 'mm-own-review': note.user.id === user.id }"
          >
            <td>
              <div class="mm-review-person">
                <span class="mm-review-avatar" aria-hidden="true">{{
                  initials(note.user.name)
                }}</span>
                <div class="mm-review-identity">
                  <div class="mm-review-name">
                    {{ note.user.name }}
                    <span v-if="note.user.id === user.id" class="mm-person-label">Você</span
                    ><span v-if="note.user.id === movie.user_id" class="mm-person-label"
                      >Adicionou o filme</span
                    >
                  </div>
                  <BaseDisclosure class="mm-review-dates">
                    <template #summary>
                      {{ formatDate(note, 'updated')
                      }}<span class="mm-sr-only"> — detalhes das datas</span>
                    </template>
                    <div class="mm-review-date-details">
                      Criada em {{ formatDate(note, 'created') }}<br />Atualizada em
                      {{ formatDate(note, 'updated') }}
                    </div>
                  </BaseDisclosure>
                </div>
              </div>
            </td>
            <td class="mm-review-score">
              <span class="mm-score-badge" :class="{ 'mm-score-hidden': !canSeeScore(note) }"
                ><strong>{{ canSeeScore(note) ? (note.note ?? '—') : '—' }}</strong
                ><small v-if="canSeeScore(note)">/ 10</small><BaseIcon v-else name="lock" /><span
                  v-if="!canSeeScore(note)"
                  class="mm-sr-only"
                  >Nota oculta</span
                ></span
              >
            </td>
            <td class="mm-review-own-actions">
              <details
                v-if="note.user.id === user.id"
                class="mm-review-menu"
                @keydown.esc.prevent.stop="closeMenu($event)"
              >
                <summary aria-label="Opções da sua avaliação" title="Opções da sua avaliação">
                  <BaseIcon name="menu" />
                </summary>
                <div>
                  <button
                    type="button"
                    :disabled="loading"
                    @click="
                      closeMenu($event);
                      openEditor(note);
                    "
                  >
                    <BaseIcon name="edit" />Editar</button
                  ><button
                    type="button"
                    :disabled="loading"
                    class="mm-delete-review"
                    @click="
                      closeMenu($event);
                      confirmDelete();
                    "
                  >
                    <BaseIcon name="close" />Excluir
                  </button>
                </div>
              </details>
            </td>
          </tr>
        </tbody>
      </table>
      <nav v-if="pageCount > 1" class="mm-pagination" aria-label="Páginas de avaliações">
        <span
          >{{ (page - 1) * pageSize + 1 }}–{{ Math.min(page * pageSize, notes.length) }} de
          {{ notes.length }}</span
        >
        <div>
          <button
            type="button"
            class="mm-review-icon"
            :disabled="page === 1"
            aria-label="Página anterior"
            @click="page--"
          >
            <BaseIcon name="chevron-left" /></button
          ><button
            type="button"
            class="mm-review-icon"
            :disabled="page === pageCount"
            aria-label="Próxima página"
            @click="page++"
          >
            <BaseIcon name="chevron-right" />
          </button>
        </div>
      </nav>
    </div>
    <BaseModal v-model="editorOpen" :title="editing ? 'Editar sua avaliação' : 'Sua avaliação'"
      ><form class="mm-note-form" @submit.prevent="saveNote">
        <label for="movie-note">Qual é sua nota, de 0 a 10?</label
        ><input
          id="movie-note"
          v-model.number="draftNote"
          type="number"
          min="0"
          max="10"
          step="1"
          required
        />
        <div class="mm-review-actions">
          <button type="button" class="mm-button" @click="editorOpen = false">Cancelar</button
          ><button class="mm-button mm-button-primary" :disabled="loading">Salvar avaliação</button>
        </div>
      </form></BaseModal
    >
    <BaseConfirmDialog ref="confirmDialogRef" @ok="deleteNote" />
  </section>
</template>
<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import type { MovieNoteType } from 'src/core/types/movie/MovieType';
import { useUserStore } from 'src/core/stores/UserStore';
import { useMovieContext } from '../composables/useMovieContext';
import { useMovieRequests } from '../composables/useMovieRequests';
import {
  sortNotes,
  noteTimestamp,
  validRating,
  mergeReview,
  cloneMovie,
} from '../utils/MovieStateUtils';
import BaseIcon from 'src/core/components/BaseIcon.vue';
import BaseDisclosure from 'src/core/components/BaseDisclosure.vue';
import BaseModal from 'src/core/components/BaseModal.vue';
import BaseConfirmDialog from 'src/core/components/BaseConfirmDialog.vue';
import MovieService from '../services/MovieService';
import DateUtils from 'src/core/utils/DateUtils';
import { stateSocketMovie } from 'src/boot/socket';
import { useMovieRoom } from '../composables/useMovieRoom';
import { showError, showSuccess } from 'src/core/utils/NotificationUtils';
const props = defineProps<{ movieId: string | string[] }>();
const userStore = useUserStore(),
  movie = useMovieContext(),
  requests = useMovieRequests();
const user = computed(() => userStore.user),
  notes = computed(() => movie.value.notes || []);
const isUserAlreadyVoted = computed(() =>
  notes.value.some((note) => note.user.id === user.value.id),
);
const privacyPending = ref(false);
const notesError = ref('');
function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}
const reviewsRoot = ref<HTMLElement>();
function closeMenu(event: Event) {
  const menu = (event.currentTarget as HTMLElement).closest('details');
  menu?.removeAttribute('open');
  menu?.querySelector('summary')?.focus();
}
function dismissMenus(event: MouseEvent) {
  for (const menu of reviewsRoot.value?.querySelectorAll<HTMLDetailsElement>(
    '.mm-review-menu[open]',
  ) || []) {
    if (!menu.contains(event.target as Node)) menu.open = false;
  }
}
onMounted(() => document.addEventListener('click', dismissMenus));
onBeforeUnmount(() => document.removeEventListener('click', dismissMenus));
let refreshQueued = false,
  visibilityQueued = false;
const loading = ref(false),
  editorOpen = ref(false),
  editing = ref(false),
  draftNote = ref<number | string>('');
const confirmDialogRef = ref<InstanceType<typeof BaseConfirmDialog>>();
const sort = ref('name'),
  page = ref(1),
  pageSize = ref(5);
const canSortScores = computed(() => movie.value.show_notes === true && !privacyPending.value);
watch(canSortScores, (allowed) => {
  if (!allowed && sort.value === 'note') sort.value = 'name';
});
const pageCount = computed(() => Math.max(1, Math.ceil(notes.value.length / pageSize.value)));
const visibleNotes = computed(() =>
  sortNotes(
    notes.value,
    sort.value === 'note' && (!movie.value.show_notes || privacyPending.value)
      ? 'name'
      : sort.value,
  ).slice((page.value - 1) * pageSize.value, page.value * pageSize.value),
);
watch([sort, pageSize], () => (page.value = 1));
watch(pageCount, (count) => (page.value = Math.min(page.value, count)));
const visibilityExpired = ref((movie.value.time_since_creation || 0) >= 1800);
let visibilityTimer: ReturnType<typeof setTimeout> | undefined;
let visibilityTarget = '';
let visibilityDeadline = Infinity;
let mounted = false;
function scheduleVisibilityDeadline() {
  clearTimeout(visibilityTimer);
  const target = `${requests.context.value}:${movie.value.id}`;
  if (target !== visibilityTarget) {
    visibilityTarget = target;
    visibilityDeadline = Infinity;
    visibilityExpired.value = false;
  }
  const elapsed = Math.max(0, movie.value.time_since_creation || 0);
  // Newer metadata may shorten the window, never extend it for this session/movie.
  visibilityDeadline = Math.min(visibilityDeadline, Date.now() + (1800 - elapsed) * 1000);
  visibilityExpired.value ||= Date.now() >= visibilityDeadline;
  if (!mounted || visibilityExpired.value || !hasTarget()) return;
  visibilityTimer = setTimeout(
    () => {
      if (target !== visibilityTarget || !hasTarget()) return;
      visibilityExpired.value = true;
      // Existing detail GET performs the backend's automatic 30-minute reveal.
      privacyPending.value = true;
      queueRefresh(true);
    },
    Math.max(0, visibilityDeadline - Date.now()),
  );
}
watch(
  () => [movie.value.id, movie.value.time_since_creation, requests.context.value, props.movieId],
  scheduleVisibilityDeadline,
);
onMounted(() => {
  mounted = true;
  scheduleVisibilityDeadline();
});
onBeforeUnmount(() => clearTimeout(visibilityTimer));
const canToggleVisibility = computed(
  () =>
    hasTarget() &&
    (userStore.isAdmin || user.value.id === movie.value.user_id) &&
    !visibilityExpired.value,
);
let editorTarget = '',
  editorOwner = '',
  editorCurrent = () => false,
  deletionTarget = '',
  deletionOwner = '',
  deletionCurrent = () => false;
const targetId = () => props.movieId.toString();
function hasTarget() {
  return user.value.isLoged && !!targetId() && movie.value.id === targetId();
}
const { join: joinRoom } = useMovieRoom(
  () => (hasTarget() ? targetId() : undefined),
  () => requests.sessionGeneration.value || '',
);
watch(
  requests.context,
  () => {
    refreshQueued = visibilityQueued = false;
    privacyPending.value = false;
    notesError.value = '';
    editorOpen.value = false;
    loading.value = false;
    page.value = 1;
    editorCurrent = () => false;
    deletionCurrent = () => false;
  },
  { flush: 'sync' },
);
watch(
  () => props.movieId,
  () => {
    requests.invalidate();
    refreshQueued = visibilityQueued = false;
    privacyPending.value = false;
    notesError.value = '';
    loading.value = false;
    editorOpen.value = false;
    page.value = 1;
    joinRoom();
    void getMovieNotes();
  },
);
for (const event of ['createNote', 'updateNote', 'deleteNote'] as const) {
  watch(
    () => stateSocketMovie[event],
    (events) => {
      const last = events.at(-1);
      if (!hasTarget() || !last?.content?.user || last.movie !== targetId()) return;
      if (
        event !== 'deleteNote' &&
        last.content.user.id === user.value.id &&
        !validRating(last.content.note)
      ) {
        // Hidden broadcasts are shared with the author too. Keep their confirmed
        // score, then recover the personalized representation after any mutation.
        queueRefresh();
        return;
      }
      movie.value.notes = mergeReview(notes.value, last.content, event === 'deleteNote');
    },
    { deep: true },
  );
}
function canSeeScore(note: MovieNoteType) {
  return (
    note.user.id === user.value.id || (movie.value.show_notes === true && !privacyPending.value)
  );
}
watch(
  () => stateSocketMovie.updateMovie,
  (events) => {
    if (!hasTarget() || events.at(-1)?.movie !== targetId()) return;
    privacyPending.value = true;
    queueRefresh(true);
  },
  { deep: true },
);
watch(
  () => stateSocketMovie.connected,
  (connected) => {
    if (!hasTarget()) return;
    privacyPending.value = true;
    if (connected) queueRefresh(true);
  },
);
watch(loading, (busy) => {
  if (!busy) void drainRefresh();
});
function queueRefresh(visibility = false) {
  if (visibility) privacyPending.value = true;
  refreshQueued = true;
  visibilityQueued ||= visibility;
  void drainRefresh();
}
async function drainRefresh() {
  if (loading.value || !refreshQueued || !hasTarget()) return;
  const metadata = visibilityQueued;
  refreshQueued = visibilityQueued = false;
  const target = targetId(),
    current = requests.begin('notes');
  loading.value = true;
  notesError.value = '';
  try {
    const record = metadata ? await MovieService.getMovie(target) : undefined;
    const result = await MovieService.getMovieNotes(target);
    if (!current() || !hasTarget()) return;
    if (record) {
      movie.value.show_notes = record.show_notes;
      if (record.time_since_creation !== undefined)
        movie.value.time_since_creation = record.time_since_creation;
    }
    movie.value.notes = result;
    if (metadata && !visibilityQueued) privacyPending.value = false;
  } catch {
    if (current()) {
      notesError.value = 'Não foi possível atualizar as avaliações.';
      showError('Erro ao buscar avaliações.');
    }
  } finally {
    if (current()) loading.value = false;
  }
}
function formatDate(note: MovieNoteType, key: 'created' | 'updated') {
  const timestamp = noteTimestamp(note, key);
  return timestamp ? DateUtils.toLocaleString(new Date(timestamp)) : '—';
}
function openEditor(note?: MovieNoteType) {
  if (
    loading.value ||
    !hasTarget() ||
    (note && note.user.id !== user.value.id) ||
    (!note && isUserAlreadyVoted.value)
  )
    return;
  editorTarget = targetId();
  editorOwner = user.value.id;
  editorCurrent = requests.begin('editor');
  editing.value = !!note;
  draftNote.value = note?.note ?? '';
  editorOpen.value = true;
}
async function saveNote() {
  if (
    loading.value ||
    !editorCurrent() ||
    !hasTarget() ||
    editorTarget !== targetId() ||
    editorOwner !== user.value.id
  )
    return;
  const value = draftNote.value === '' ? NaN : Number(draftNote.value);
  if (!validRating(value)) return;
  const existing = notes.value.find((note) => note.user.id === editorOwner);
  if (editing.value ? !existing : !!existing) return;
  const target = editorTarget,
    owner = editorOwner,
    current = requests.begin('mutation');
  loading.value = true;
  try {
    if (editing.value) {
      const result = await MovieService.updateMovieNotes(value, target);
      if (!current() || !hasTarget()) return;
      if (result.user.id !== owner) throw new Error('Unexpected review author');
      movie.value.notes = mergeReview(notes.value, result);
    } else {
      const result = await MovieService.createMovieNote(value, target);
      if (!current() || !hasTarget()) return;
      movie.value.notes = mergeReview(notes.value, result);
    }
    editorOpen.value = false;
    showSuccess('Avaliação salva.');
  } catch {
    if (current()) showError('Não foi possível salvar sua avaliação.');
  } finally {
    if (current()) loading.value = false;
  }
}
async function getMovieNotes() {
  if (loading.value || !hasTarget()) return;
  if (privacyPending.value) {
    queueRefresh(true);
    return;
  }
  const target = targetId(),
    current = requests.begin('notes');
  loading.value = true;
  notesError.value = '';
  try {
    const result = await MovieService.getMovieNotes(target);
    if (current() && hasTarget()) movie.value.notes = result;
  } catch {
    if (current()) {
      notesError.value = 'Não foi possível atualizar as avaliações.';
      showError('Erro ao buscar avaliações.');
    }
  } finally {
    if (current()) loading.value = false;
  }
}
function confirmDelete() {
  if (loading.value || !hasTarget() || !isUserAlreadyVoted.value) return;
  deletionTarget = targetId();
  deletionOwner = user.value.id;
  deletionCurrent = requests.begin('delete-confirm');
  confirmDialogRef.value?.show({
    message: 'Excluir sua avaliação deste filme?',
    title: 'Excluir avaliação',
    focus: 'cancel',
    ok: 'Excluir',
  });
}
async function deleteNote() {
  if (
    loading.value ||
    !deletionCurrent() ||
    !hasTarget() ||
    deletionTarget !== targetId() ||
    deletionOwner !== user.value.id ||
    !isUserAlreadyVoted.value
  )
    return;
  const target = deletionTarget,
    owner = deletionOwner,
    current = requests.begin('mutation');
  loading.value = true;
  try {
    await MovieService.deleteMovieNotes(target);
    if (!current() || !hasTarget()) return;
    movie.value.notes = notes.value.filter((note) => note.user.id !== owner);
    showSuccess('Avaliação excluída.');
  } catch {
    if (current()) showError('Erro ao excluir avaliação.');
  } finally {
    if (current()) loading.value = false;
  }
}
async function updateShowNotes(visible: boolean) {
  if (loading.value || !hasTarget() || !canToggleVisibility.value) return;
  const target = cloneMovie(movie.value),
    current = requests.begin('mutation');
  loading.value = true;
  target.show_notes = visible;
  try {
    const result = await MovieService.updateMovie({
      ...target,
      genres: target.genres?.map((genre) => genre.id),
    });
    if (!current() || !hasTarget()) return;
    movie.value.show_notes = result.show_notes ?? visible;
    queueRefresh(true);
    showSuccess('Visibilidade atualizada.');
  } catch {
    if (current()) showError('Erro ao atualizar visibilidade.');
  } finally {
    if (current()) loading.value = false;
  }
}
</script>
<style scoped>
.mm-reviews {
  min-width: 0;
  width: 100%;
  margin-top: 2rem;
  padding: clamp(1rem, 2vw, 1.5rem);
  border: 1px solid var(--mm-border);
  border-radius: 20px;
  background: var(--mm-surface);
}
.mm-reviews-content {
  width: 100%;
  max-width: 60rem;
  margin-inline: auto;
}
.mm-review-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.mm-review-heading h2 {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  font-size: 1.25rem;
  margin: 0;
}
.mm-review-count {
  display: inline-grid;
  place-items: center;
  min-width: 1.8rem;
  height: 1.8rem;
  padding: 0 0.4rem;
  font-size: 0.8rem;
  font-weight: 600;
  border-radius: 8px;
  color: var(--mm-muted);
  background: var(--mm-raised);
}
.mm-review-heading p {
  color: var(--mm-muted);
  font-size: 0.83rem;
  margin: 0.35rem 0 0;
  line-height: 1.5;
}
.mm-review-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}
.mm-review-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  justify-content: flex-end;
  margin: 0.6rem 0 0.1rem;
}
.mm-review-controls label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--mm-muted);
  font-size: 0.75rem;
}
.mm-review-controls select {
  width: auto;
  min-height: 44px;
  max-width: 180px;
  margin: 0;
  padding: 0.4rem 1.8rem 0.4rem 0.7rem;
  font: inherit;
  color: var(--mm-text);
  background: var(--mm-surface);
  border: 1px solid var(--mm-border);
  border-radius: 10px;
}
.mm-rating-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 0.75rem;
  table-layout: auto;
}
.mm-rating-table th {
  text-align: left;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--mm-muted);
  padding: 0.6rem 0.5rem;
}
.mm-rating-table th:nth-child(2) {
  text-align: right;
}
.mm-rating-table th:last-child {
  width: 48px;
}
.mm-rating-table td {
  padding: 0.9rem 0.5rem;
  border-top: 1px solid var(--mm-border);
  vertical-align: middle;
}
.mm-review-person {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  min-width: 0;
}
.mm-review-avatar {
  display: grid;
  place-items: center;
  flex: 0 0 38px;
  height: 38px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--mm-link);
  background: color-mix(in srgb, var(--mm-accent) 8%, var(--mm-raised));
  border: 1px solid var(--mm-border);
}
.mm-review-identity {
  min-width: 0;
}
.mm-review-name {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
  font-weight: 600;
  font-size: 0.95rem;
  overflow-wrap: anywhere;
}
.mm-person-label {
  font-size: 0.65rem;
  font-weight: 500;
  color: var(--mm-muted);
  padding: 0.1rem 0.35rem;
  border: 1px solid var(--mm-border);
  border-radius: 4px;
}
.mm-review-dates {
  font-size: 0.72rem;
  color: var(--mm-muted);
  margin-top: 0.25rem;
}
.mm-review-dates :deep(.mm-disclosure-trigger) {
  cursor: pointer;
  width: fit-content;
}
.mm-review-date-details {
  line-height: 1.6;
  padding-top: 0.4rem;
}
.mm-review-score {
  text-align: right;
  width: 90px;
  white-space: nowrap;
}
.mm-score-badge {
  display: inline-flex;
  align-items: baseline;
  gap: 0.25rem;
  padding: 0.4rem 0.65rem;
  border-radius: 10px;
  background: var(--mm-raised);
}
.mm-score-badge strong {
  font-size: 1.3rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.mm-score-badge small {
  font-size: 0.7rem;
  color: var(--mm-muted);
}
.mm-score-hidden {
  color: var(--mm-muted);
  align-items: center;
  gap: 0.45rem;
}
.mm-score-hidden svg {
  width: 13px;
  height: 13px;
}
.mm-review-menu {
  position: relative;
}
.mm-review-menu summary,
.mm-review-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  cursor: pointer;
  list-style: none;
  border: 0;
  background: transparent;
  color: var(--mm-muted);
  border-radius: 10px;
  padding: 0;
}
.mm-review-menu summary::-webkit-details-marker {
  display: none;
}
.mm-review-menu summary:hover,
.mm-review-icon:hover {
  color: var(--mm-text);
  background: var(--mm-raised);
}
.mm-review-menu > div {
  position: absolute;
  right: 0;
  top: 44px;
  z-index: 4;
  min-width: 150px;
  padding: 0.35rem;
  border: 1px solid var(--mm-border);
  border-radius: 12px;
  background: var(--mm-surface);
  box-shadow: 0 12px 32px #0003;
}
.mm-review-menu button {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-height: 44px;
  width: 100%;
  border: 0;
  border-radius: 8px;
  padding: 0.5rem 0.7rem;
  background: transparent;
  color: var(--mm-text);
  font: inherit;
  font-size: 0.85rem;
  text-align: left;
  cursor: pointer;
}
.mm-review-menu button:hover {
  background: var(--mm-raised);
}
.mm-review-menu .mm-delete-review {
  color: var(--mm-danger-text);
}
.mm-visibility-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--mm-muted);
  min-height: 44px;
  cursor: pointer;
}
.mm-visibility-toggle input {
  appearance: none;
  width: 32px;
  height: 20px;
  min-height: 0;
  border-radius: 20px;
  padding: 0;
  margin: 0;
  background: var(--mm-raised);
  border: 1px solid var(--mm-border);
  position: relative;
  cursor: pointer;
}
.mm-visibility-toggle input::before {
  content: '';
  position: absolute;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  top: 2px;
  left: 2px;
  background: var(--mm-muted);
  transition: transform 0.18s;
}
.mm-visibility-toggle input:checked {
  background: var(--mm-accent);
}
.mm-visibility-toggle input:checked::before {
  background: #08262a;
  transform: translateX(12px);
}
.mm-review-progress {
  height: 3px;
  margin-top: 0.8rem;
  overflow: hidden;
  background: var(--mm-raised);
  border-radius: 4px;
}
.mm-review-progress > span:first-child {
  display: block;
  height: 100%;
  width: 35%;
  background: var(--mm-link);
  animation: review-progress 1.4s ease-in-out infinite;
}
.mm-review-error {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  padding: 0.7rem;
  color: var(--mm-danger-text);
  background: var(--mm-raised);
  border-radius: 10px;
  font-size: 0.85rem;
}
.mm-review-empty {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.8rem 0.25rem;
  flex-wrap: wrap;
}
.mm-review-empty h3 {
  margin: 0;
  font-size: 1rem;
}
.mm-review-empty p {
  color: var(--mm-muted);
  margin: 0.4rem 0 0;
  font-size: 0.85rem;
}
.mm-review-empty > div:nth-child(2) {
  flex: 1;
  min-width: 180px;
}
.mm-empty-symbol {
  font-size: 2rem;
  color: var(--mm-link);
}
.mm-review-skeleton > div {
  display: flex;
  align-items: center;
  gap: 1rem;
  min-height: 76px;
  border-bottom: 1px solid var(--mm-border);
}
.mm-review-skeleton i,
.mm-review-skeleton span,
.mm-review-skeleton b {
  display: block;
  background: var(--mm-raised);
  border-radius: 8px;
  height: 18px;
}
.mm-review-skeleton i {
  width: 38px;
  height: 38px;
}
.mm-review-skeleton span {
  width: 35%;
}
.mm-review-skeleton b {
  width: 50px;
  margin-left: auto;
}
.mm-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--mm-border);
  padding-top: 0.6rem;
  font-size: 0.75rem;
  color: var(--mm-muted);
}
.mm-pagination > div {
  display: flex;
}
.mm-note-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.mm-note-form input {
  font-size: 2rem;
  width: 100%;
}
.mm-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
@keyframes review-progress {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(390%);
  }
}
@media (max-width: 600px) {
  .mm-review-controls {
    justify-content: flex-start;
    flex-wrap: wrap;
  }
  .mm-rating-table td {
    padding: 0.8rem 0.2rem;
  }
  .mm-review-avatar {
    display: none;
  }
  .mm-review-score {
    width: 65px;
  }
  .mm-person-label {
    font-size: 0.6rem;
  }
  .mm-review-name {
    font-size: 0.85rem;
  }
  .mm-review-header {
    gap: 0.6rem;
  }
}
@media (prefers-reduced-motion: reduce) {
  .mm-review-progress > span:first-child {
    animation: none;
    width: 100%;
  }
  .mm-visibility-toggle input::before {
    transition: none;
  }
}
</style>
