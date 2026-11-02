<template>
  <section class="mm-reviews" :aria-busy="loading">
    <header class="mm-review-header">
      <div>
        <p class="mm-eyebrow">O que a comunidade achou</p>
        <h2>
          Avaliações <span>{{ notes.length }}</span>
        </h2>
      </div>
      <div class="mm-review-actions">
        <label v-if="canToggleVisibility"
          ><input
            type="checkbox"
            :checked="movie.show_notes"
            :disabled="loading"
            @change="updateShowNotes(($event.target as HTMLInputElement).checked)"
          />
          Notas visíveis</label
        ><button class="mm-button" type="button" :disabled="loading" @click="getMovieNotes">
          Atualizar</button
        ><button
          class="mm-button mm-button-primary"
          type="button"
          :disabled="loading || isUserAlreadyVoted"
          @click="openEditor()"
        >
          {{ isUserAlreadyVoted ? 'Você já avaliou' : 'Avaliar filme' }}
        </button>
      </div>
    </header>
    <div class="mm-review-controls">
      <label
        >Ordenar
        <select v-model="sort">
          <option value="name">Nome A–Z</option>
          <option value="name-desc">Nome Z–A</option>
          <option value="note">Maior nota</option>
          <option value="updated">Mais recentes</option>
        </select></label
      ><label
        >Por página
        <select v-model.number="pageSize">
          <option :value="5">5</option>
          <option :value="10">10</option>
        </select></label
      >
    </div>
    <p v-if="!notes.length" class="mm-empty">
      A conversa começa com você. Seja o primeiro a avaliar.
    </p>
    <div class="mm-table-scroll" v-else>
      <table class="mm-table">
        <thead>
          <tr>
            <th>Pessoa</th>
            <th>Nota</th>
            <th>Criada em</th>
            <th>Atualizada em</th>
            <th><span class="mm-sr-only">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="note in visibleNotes" :key="note.user.id">
            <td>{{ note.user.id === movie.user_id ? '♛ ' : '' }}{{ note.user.name }}</td>
            <td>
              <strong>{{ canSeeScore(note) ? (note.note ?? '—') : '—' }}</strong> / 10
            </td>
            <td>{{ formatDate(note, 'created') }}</td>
            <td>{{ formatDate(note, 'updated') }}</td>
            <td>
              <template v-if="note.user.id === user.id"
                ><button
                  type="button"
                  class="mm-button"
                  :disabled="loading"
                  @click="openEditor(note)"
                >
                  Editar</button
                ><button
                  type="button"
                  class="mm-button mm-danger"
                  :disabled="loading"
                  @click="confirmDelete"
                >
                  Excluir
                </button></template
              >
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <nav v-if="pageCount > 1" class="mm-pagination" aria-label="Páginas de avaliações">
      <button type="button" class="mm-button" :disabled="page === 1" @click="page--">
        Anterior</button
      ><span>{{ page }} / {{ pageCount }}</span
      ><button type="button" class="mm-button" :disabled="page === pageCount" @click="page++">
        Próxima
      </button>
    </nav>
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
  () => requests.token.value || '',
);
watch(
  requests.context,
  () => {
    refreshQueued = visibilityQueued = false;
    privacyPending.value = false;
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
    if (current()) showError('Erro ao buscar avaliações.');
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
  try {
    const result = await MovieService.getMovieNotes(target);
    if (current() && hasTarget()) movie.value.notes = result;
  } catch {
    if (current()) showError('Erro ao buscar avaliações.');
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
  margin-top: 3rem;
  padding: 1.5rem;
  border: 1px solid #8883;
  border-radius: 20px;
  background: var(--grey-dark2);
}
.mm-review-header,
.mm-review-actions,
.mm-review-controls,
.mm-pagination {
  display: flex;
  gap: 0.8rem;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
}
.mm-review-header h2 span {
  font-size: 1rem;
  opacity: 0.5;
}
.mm-eyebrow {
  font-size: 0.7rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--primary);
}
.mm-review-controls {
  justify-content: flex-end;
  font-size: 0.8rem;
  margin: 1.5rem 0;
}
.mm-review-controls select,
.mm-note-form input {
  background: var(--grey-mid);
  color: inherit;
  border: 1px solid #8884;
  border-radius: 8px;
  padding: 0.5rem;
}
.mm-table-scroll {
  overflow: auto;
}
.mm-table {
  border-collapse: collapse;
  width: 100%;
  text-align: left;
  white-space: nowrap;
}
.mm-table th {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.6;
}
.mm-table th,
.mm-table td {
  padding: 1rem 0.7rem;
  border-bottom: 1px solid #8882;
}
.mm-table td .mm-button {
  font-size: 0.75rem;
}
.mm-danger {
  color: #fb7185;
}
.mm-pagination {
  justify-content: flex-end;
  margin-top: 1rem;
}
.mm-empty {
  padding: 2rem 0;
  opacity: 0.6;
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
  clip: rect(0, 0, 0, 0);
}
</style>
