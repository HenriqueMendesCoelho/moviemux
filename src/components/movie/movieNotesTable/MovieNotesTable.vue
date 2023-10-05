<template>
  <SeparatorDivSolidLine v-if="!isRegisterOrEditing" />
  <div class="row justify-center q-mt-md" v-if="!isRegisterOrEditing">
    <q-table
      class="col-8"
      title="Notas"
      :rows="moviePage.selectedMovie.notes"
      dense
      dark
      card-class="text-white bg-grey-mid2"
      row-key="index"
      virtual-scroll
      no-data-label="Ainda não há notas para esse filme :("
      :rows-per-page-options="[5, 10]"
      :columns="columns"
      :loading="loading"
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
          <CustomTooltip anchor="bottom right" :delay="500" :hide-delay="300">Alternar visibilidade das notas</CustomTooltip>
        </div>
        <div>
          <q-btn class="q-mr-sm" flat round icon="add" @click="showConfirmPromptDelete" :disable="isUserAlreadyVoted" />
          <CustomTooltip anchor="bottom right" :delay="500" :hide-delay="300" v-if="isUserAlreadyVoted"
            >Você já votou nesse filme!</CustomTooltip
          >
        </div>
        <q-btn flat round icon="refresh" @click="getMovieNotes" />
      </template>

      <template v-slot:body="props">
        <q-tr :props="props">
          <q-td key="owner" :props="props"><q-icon name="fa-solid fa-crown" v-if="showCrown(props.row)" /></q-td>
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
            <CustomTooltip :delay="200" v-if="showEdit(props.row)">Clique para editar</CustomTooltip>
          </q-td>
          <q-td key="createdAt" :props="props">{{ props.cols[3].value }}</q-td>
          <q-td key="updatedAt" :props="props">{{ props.cols[4].value }}</q-td>
          <q-td key="actions" :props="props"
            ><q-btn dense round flat color="white" icon="delete" v-if="showEdit(props.row)" @click="showConfirmDialogDelete">
              <CustomTooltip anchor="bottom right" :delay="500" :hide-delay="300">Deletar</CustomTooltip>
            </q-btn></q-td
          >
        </q-tr>
      </template>
    </q-table>
    <ConfirmDialog ref="confirmDialogRef" @ok="deleteNote()" />
    <ConfirmDialogPrompt ref="confirmDialogPromptRef" @ok="createNote($event)" />
  </div>
</template>
<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, toRaw } from 'vue';
import { useQuasar } from 'quasar';

import type { QTableProps } from 'quasar';
import { MovieNoteType } from 'src/types/movie/MovieType';
import { InputTextRefType } from 'src/components/shared/inputText/types/InputValidateRefType';
import { ConfirmDialogRefType } from 'src/components/shared/confirmDialog/types/ConfirmDialogType';
import { ConfirmDialogPromptRefType } from './confirmDialogPrompt/types/ConfirmDialogPrompt';

import { useUserStore } from 'src/stores/UserStore';
import { useMovieStore } from 'src/stores/MovieStore';

import MovieService from 'src/services/MovieService';
import stringUtils from 'src/utils/stringUtils';
import { socketMovie, stateSocketMovie } from 'src/boot/socket';

import SeparatorDivSolidLine from 'src/components/shared/separator/SeparatorDivLineSolid.vue';
import CustomTooltip from 'src/components/shared/customTooltip/CustomTooltip.vue';
import ConfirmDialog from 'src/components/shared/confirmDialog/ConfirmDialog.vue';
import ConfirmDialogPrompt from './confirmDialogPrompt/ConfirmDialogPrompt.vue';

interface Props {
  isRegisterOrEditing: boolean;
  movieId: string | string[];
}

const props = defineProps<Props>();

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
    format: (val) => stringUtils.dateToLocaleString(val),
  },
  {
    name: 'updatedAt',
    label: 'Atualizado em',
    field: 'updated_at',
    align: 'center',
    format: (val) => stringUtils.dateToLocaleString(val),
  },
  {
    name: 'actions',
    label: '',
    field: '',
    align: 'center',
  },
]);

const $q = useQuasar();
const inputNoteRef = ref<InputTextRefType>();
const confirmDialogRef = ref<ConfirmDialogRefType>();
const confirmDialogPromptRef = ref<ConfirmDialogPromptRefType>();

const movieStore = useMovieStore();
const userStore = useUserStore();

const loading = ref(false);

const moviePage = computed(() => movieStore.moviePage);
const isUserAlreadyVoted = computed(() => movieStore.isUserAlreadyVoted);
const user = computed(() => userStore.user);

onMounted(() => {
  if (!stateSocketMovie.connected) {
    socketMovie.connect();
  }
});

onBeforeUnmount(() => {
  if (stateSocketMovie.connected) {
    socketMovie.disconnect();
  }
});

watch(
  () => stateSocketMovie.createNote,
  (val) => {
    const lastEvent = toRaw(val)[val.length - 1];
    const movieSelected = moviePage.value.selectedMovie;
    if (lastEvent.content.user.id === user.value.id || lastEvent.movie !== movieSelected.id) {
      return;
    }
    moviePage.value.selectedMovie.notes?.push(lastEvent.content);
  },
  { deep: true }
);

watch(
  () => stateSocketMovie.updateNote,
  (val) => {
    const lastEvent = toRaw(val)[val.length - 1];
    const movieSelected = moviePage.value.selectedMovie;
    if (lastEvent.content.user.id === user.value.id || lastEvent.movie !== movieSelected.id) {
      return;
    }

    const notes = moviePage.value.selectedMovie.notes;
    const userIdToOverride = lastEvent.content.user.id;

    notes?.forEach((n, index) => {
      if (n.user.id === userIdToOverride) {
        notes[index] = lastEvent.content;
      }
    });
  },
  { deep: true }
);

watch(
  () => stateSocketMovie.deleteNote,
  (val) => {
    const lastEvent = toRaw(val)[val.length - 1];
    const movieSelected = moviePage.value.selectedMovie;
    if (lastEvent.content.user.id === user.value.id || lastEvent.movie !== movieSelected.id) {
      return;
    }
    moviePage.value.selectedMovie.notes = moviePage.value.selectedMovie.notes?.filter((n) => n.user.id !== lastEvent.content.user.id);
  },
  { deep: true }
);

function showSuccess(msg: string) {
  $q.notify({
    type: 'positive',
    message: msg,
    position: 'top',
  });
}
function showError(msg: string) {
  $q.notify({
    type: 'negative',
    message: msg,
    position: 'top',
  });
}

function showEdit(row: MovieNoteType): boolean {
  return row.user.id === user.value.id;
}
function showCrown(row: MovieNoteType): boolean {
  return row.user.id === moviePage.value.selectedMovie.user_id;
}
function showToggleVisibility() {
  return user.value.roles.includes('ADM') || user.value.id === moviePage.value.selectedMovie.user_id;
}
function showConfirmDialogDelete() {
  confirmDialogRef.value?.dialog('Quer mesmo excluir sua nota?', 'cancel', 'Confirme a exclusão', 'Deletar');
}
function showConfirmPromptDelete() {
  confirmDialogPromptRef.value?.dialog();
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
