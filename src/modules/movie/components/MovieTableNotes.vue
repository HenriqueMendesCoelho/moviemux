<template>
  <BaseHorizontalSeparator />
  <div class="row justify-center q-mt-md">
    <q-table
      class="col-md-8 col-xs-12"
      title="Notas"
      :rows="moviePage.selectedMovie.notes || []"
      dense
      dark
      card-class="text-white bg-grey-mid2"
      row-key="name"
      virtual-scroll
      no-data-label="Ainda não há notas para esse filme :("
      :rows-per-page-options="[5, 10]"
      :columns="columns"
      :loading="loading"
      :visible-columns="visibleColumns"
    >
      <template v-slot:top-right>
        <div v-if="showToggleVisibility()">
          <q-toggle
            :model-value="moviePage.selectedMovie.show_notes"
            @update:model-value="updateShowNotes"
            size="md"
            color="kb-primary"
            checked-icon="visibility"
            unchecked-icon="visibility_off"
          />
          <BaseTooltip anchor="bottom right" :delay="500" :hide-delay="300"
            >Alternar visibilidade das notas</BaseTooltip
          >
        </div>
        <div>
          <q-btn
            class="q-mr-sm"
            flat
            round
            icon="add"
            @click="showDialogCreateNote"
            :disable="isUserAlreadyVoted"
          />
          <BaseTooltip
            anchor="bottom right"
            :delay="500"
            :hide-delay="300"
            v-if="isUserAlreadyVoted"
            >Você já votou nesse filme!</BaseTooltip
          >
        </div>
        <q-btn flat round icon="refresh" @click="getMovieNotes" />
      </template>

      <template v-slot:body="props">
        <q-tr :props="props">
          <q-td key="owner" :props="props"
            ><q-icon name="fa-solid fa-crown" v-if="showCrown(props.row)"
          /></q-td>
          <q-td key="userName" :props="props">{{ props.cols[1].value }}</q-td>
          <q-td key="note" :props="props">
            {{ !isNaN(props.row?.note) ? props.row.note : '-' }}
            <q-popup-edit
              class="bg-grey-mid2"
              :model-value="props.row.note"
              @save="updateNote(props.row, $event)"
              title="Atualizar Nota"
              buttons
              v-slot="scope"
              color="kb-primary"
              dark
              label-set="Salvar"
              :validate="(val) => rulePopUp(val)"
              v-if="showEdit(props.row)"
            >
              <q-input
                ref="inputNoteRef"
                color="kb-primary"
                dark
                v-model="scope.value"
                dense
                autofocus
                mask="##"
                :rules="[(val) => ruleInputNote(val)]"
              />
            </q-popup-edit>
            <BaseTooltip :delay="200" v-if="showEdit(props.row)">Clique para editar</BaseTooltip>
          </q-td>
          <template v-if="isDesktop">
            <q-td key="createdAt" :props="props">{{ props.cols[3].value }}</q-td>
            <q-td key="updatedAt" :props="props">{{ props.cols[4].value }}</q-td>
          </template>
          <template v-else>
            <q-td key="updatedAt" :props="props">{{ props.cols[3].value }}</q-td>
          </template>
          <q-td key="actions" :props="props"
            ><q-btn
              dense
              round
              flat
              color="white"
              icon="delete"
              v-if="showEdit(props.row)"
              @click="showConfirmDialogDelete"
            >
              <BaseTooltip anchor="bottom right" :delay="500" :hide-delay="300"
                >Deletar</BaseTooltip
              >
            </q-btn></q-td
          >
        </q-tr>
      </template>
    </q-table>
    <BaseConfirmDialog ref="confirmDialogRef" @ok="deleteNote()" />
  </div>
</template>
<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, toRaw } from 'vue';
import { useQuasar, Cookies } from 'quasar';

import type { QInput, QTableProps } from 'quasar';
import type { MovieNoteType } from 'src/core/types/movie/MovieType';

import { useUserStore } from 'src/core/stores/UserStore';
import { useMovieStore } from '../stores/MovieStore';

import BaseHorizontalSeparator from 'src/core/components/BaseHorizontalSeparator.vue';
import BaseTooltip from 'src/core/components/BaseTooltip.vue';
import BaseConfirmDialog from 'src/core/components/BaseConfirmDialog.vue';

import MovieService from '../services/MovieService';
import DateUtils from 'src/core/utils/DateUtils';
import { socketMovie, stateSocketMovie } from 'src/boot/socket';
import { showError, showSuccess } from 'src/core/utils/NotificationUtils';
import { dialogMovieNote } from '../utils/MovieDialogUtils';

const props = defineProps<{
  movieId: string | string[];
}>();
const $q = useQuasar();
const isDesktop = $q.platform.is.desktop;
const isMobile = $q.platform.is.mobile;

const columns = ref<QTableProps['columns']>([
  {
    name: 'owner',
    label: '',
    field: '',
    align: 'right',
  },
  {
    name: 'userName',
    label: 'Nome',
    field: (row) => row.user.name,
    align: 'center',
    sortable: true,
  },
  {
    name: 'note',
    label: 'Nota',
    field: 'note',
    align: 'center',
  },
  {
    name: 'createdAt',
    label: 'Criado em',
    field: 'created_at',
    align: 'center',

    format: (val) => DateUtils.toLocaleString(val),
  },
  {
    name: 'updatedAt',
    label: 'Última atualização',
    field: 'updated_at',
    align: 'center',

    format: (val) => DateUtils.toLocaleString(val),
  },
  {
    name: 'actions',
    label: '',
    field: '',
    align: 'center',
  },
]);
const visibleColumns = columns.value?.map((column) => {
  const columnName = column.name;

  if (isMobile && columnName === 'createdAt') {
    return;
  }
  return columnName;
});

const inputNoteRef = ref<InstanceType<typeof QInput>>();
const confirmDialogRef = ref<InstanceType<typeof BaseConfirmDialog>>();

const movieStore = useMovieStore();
const userStore = useUserStore();

const loading = ref(false);

const moviePage = computed(() => movieStore.moviePage);
const isUserAlreadyVoted = computed(() => movieStore.isUserAlreadyVoted);
const user = computed(() => userStore.user);

onMounted(() => {
  if (stateSocketMovie.connected) {
    return;
  }
  stateSocketMovie.token = Cookies.get('auth-kb');
  socketMovie.connect();

  if (!props.movieId?.toString()) {
    return;
  }

  socketMovie.emit('join-room', {
    room: props.movieId.toString(),
  });
});

onBeforeUnmount(() => {
  if (stateSocketMovie.connected) {
    stateSocketMovie.token = Cookies.get('auth-kb');
    socketMovie.disconnect();
  }
});

watch(
  () => stateSocketMovie.createNote,
  (val) => {
    const lastEvent = toRaw(val)[val.length - 1];
    const movieSelected = moviePage.value.selectedMovie;
    if (
      !lastEvent?.content ||
      lastEvent?.content.user.id === user.value.id ||
      lastEvent?.movie !== movieSelected.id
    ) {
      return;
    }
    moviePage.value.selectedMovie.notes?.push(lastEvent.content);
  },
  { deep: true },
);

watch(
  () => stateSocketMovie.updateNote,
  (val) => {
    const lastEvent = toRaw(val)[val.length - 1];
    const movieSelected = moviePage.value.selectedMovie;
    if (
      lastEvent === undefined ||
      lastEvent?.content ||
      lastEvent?.content.user.id === user.value.id ||
      lastEvent?.movie !== movieSelected.id
    ) {
      return;
    }

    const notes = moviePage.value.selectedMovie.notes;
    const userIdToOverride = lastEvent?.content.user.id;

    notes?.forEach((n, index) => {
      if (n.user.id === userIdToOverride) {
        notes[index] = lastEvent.content;
      }
    });
  },
  { deep: true },
);

watch(
  () => stateSocketMovie.deleteNote,
  (val) => {
    const lastEvent = toRaw(val)[val.length - 1];
    const movieSelected = moviePage.value.selectedMovie;
    if (
      lastEvent === undefined ||
      lastEvent?.content ||
      lastEvent?.content.user.id === user.value.id ||
      lastEvent?.movie !== movieSelected.id
    ) {
      return;
    }
    moviePage.value.selectedMovie.notes = moviePage.value.selectedMovie.notes?.filter(
      (n) => n.user.id !== lastEvent.content.user.id,
    );
  },
  { deep: true },
);

function showEdit(row: MovieNoteType): boolean {
  return row.user.id === user.value.id;
}
function showCrown(row: MovieNoteType): boolean {
  return row.user.id === moviePage.value.selectedMovie.user_id;
}
function showToggleVisibility() {
  const timeSinceCreation = moviePage.value.selectedMovie.time_since_creation || 0;
  return (
    (user.value.roles.includes('ADM') || user.value.id === moviePage.value.selectedMovie.user_id) &&
    timeSinceCreation < 1800
  );
}
function showConfirmDialogDelete() {
  confirmDialogRef.value?.show({
    message: 'Quer mesmo excluir sua nota?',
    focus: 'cancel',
    title: 'Confirme a exclusão',
    ok: 'Deletar',
  });
}
function showDialogCreateNote() {
  dialogMovieNote({
    onOk(data) {
      createNote(data).catch(() => void 0);
    },
  });
}
async function createNote(note: string | undefined) {
  if (!note) {
    return false;
  }

  const noteConverted = parseInt(note);
  if (typeof noteConverted !== 'number') {
    return false;
  }

  try {
    loading.value = true;
    const res = await MovieService.createMovieNote(noteConverted, props.movieId);
    moviePage.value.selectedMovie.notes?.push(res);
  } catch {
    showError('Erro ao cadastrar nota.');
  } finally {
    loading.value = false;
  }
}
async function getMovieNotes() {
  if (!props.movieId) {
    return;
  }

  try {
    loading.value = true;
    const res = await MovieService.getMovieNotes(props.movieId);
    moviePage.value.selectedMovie.notes = res;
  } catch {
    showError('Erro ao buscar notas.');
  } finally {
    loading.value = false;
  }
}
async function updateNote(row: MovieNoteType, note: string) {
  try {
    loading.value = true;

    const noteConvertedToNumber = parseInt(note);
    if (!noteConvertedToNumber) {
      return;
    }

    await MovieService.updateMovieNotes(noteConvertedToNumber, props.movieId);
    row.note = noteConvertedToNumber;
    showSuccess('Nota atualizada.');
  } catch {
    showError('Erro ao atualizar nota.');
  } finally {
    loading.value = false;
  }
}
async function deleteNote() {
  try {
    loading.value = true;

    await MovieService.deleteMovieNotes(props.movieId);
    movieStore.removeNoteFromStore(user.value.id);
    showSuccess('Nota deletada.');
  } catch {
    showError('Erro ao deletar nota.');
  } finally {
    loading.value = false;
  }
}
function ruleInputNote(val: string) {
  const noteConvertedToNumber = parseInt(val);
  if (typeof noteConvertedToNumber !== 'number') {
    return false;
  }

  return noteConvertedToNumber <= 10 ? true : 'A nota pode ser no máximo 10.';
}
function rulePopUp(val: string) {
  const noteConvertedToNumber = parseInt(val);
  if (typeof noteConvertedToNumber !== 'number') {
    return false;
  }

  return noteConvertedToNumber <= 10;
}
async function updateShowNotes(showNotes: boolean) {
  try {
    moviePage.value.selectedMovie.show_notes = showNotes;

    await MovieService.updateMovie({
      ...moviePage.value.selectedMovie,
      genres: moviePage.value.selectedMovie.genres?.map((g) => g.id),
    });

    showSuccess('Visilidade das notas atualizada');
  } catch {
    showError('Erro ao atualizar visibilidade das notas');
  }
}
</script>
