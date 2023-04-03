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
            {{ props.row.note }}
            <q-popup-edit
              class="bg-grey-mid2"
              :model-value="props.row.note"
              @save="updateNote(props.row, $event)"
              title="Atualizar Nota"
              buttons
              v-slot="scope"
              v-if="showEdit(props.row)"
              color="kb-primary"
              dark
              label-set="Salvar"
              :validate="(val) => rulePopUp(val)"
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
          <q-td key="createdAt" :props="props">{{ props.cols[2].value }}</q-td>
          <q-td key="updatedAt" :props="props">{{ props.cols[3].value }}</q-td>
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
<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useQuasar } from 'quasar';
import { mapActions, mapState } from 'pinia';

import type { QTableProps } from 'quasar';
import { MovieNoteType } from '@/types/movie/MovieType';
import { InputTextRefType } from '@/components/shared/inputText/types/InputValidateRefType';
import { ConfirmDialogRefType } from '@/components/shared/confirmDialog/types/ConfirmDialogType';
import { ConfirmDialogPromptRefType } from './confirmDialogPrompt/types/ConfirmDialogPrompt';

import { useUserStore } from '@/stores/UserStore';
import { useMovieStore } from '@/stores/MovieStore';

import MovieService from '@/services/MovieService';

import SeparatorDivSolidLine from '@/components/shared/separator/SeparatorDivLineSolid.vue';
import CustomTooltip from '@/components/shared/customTooltip/CustomTooltip.vue';
import ConfirmDialog from '@/components/shared/confirmDialog/ConfirmDialog.vue';
import ConfirmDialogPrompt from './confirmDialogPrompt/ConfirmDialogPrompt.vue';

export default defineComponent({
  name: 'NotesDescription',
  components: { SeparatorDivSolidLine, CustomTooltip, ConfirmDialog, ConfirmDialogPrompt },
  props: {
    isRegisterOrEditing: {
      type: Boolean,
    },
    movieId: {
      type: [String, Array<string>],
    },
  },
  setup() {
    const columns: QTableProps['columns'] = [
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
        format: (val) => new Date(val).toLocaleString(),
      },
      {
        name: 'updatedAt',
        label: 'Atualizado em',
        field: 'updated_at',
        align: 'center',
        format: (val) => new Date(val).toLocaleString(),
      },
      {
        name: 'actions',
        label: '',
        field: '',
        align: 'center',
      },
    ];
    const $q = useQuasar();
    const inputNoteRef = ref<InputTextRefType>();
    const confirmDialogRef = ref<ConfirmDialogRefType>();
    const confirmDialogPromptRef = ref<ConfirmDialogPromptRefType>();
    return {
      columns,
      inputNoteRef,
      confirmDialogRef,
      confirmDialogPromptRef,
      showSuccess(msg: string) {
        $q.notify({
          type: 'positive',
          message: msg,
          position: 'top',
        });
      },
      showError(msg: string) {
        $q.notify({
          type: 'negative',
          message: msg,
          position: 'top',
        });
      },
    };
  },
  data() {
    return {
      loading: false,
    };
  },
  computed: {
    ...mapState(useMovieStore, ['moviePage', 'isUserAlreadyVoted']),
    ...mapState(useUserStore, ['user']),
  },
  methods: {
    ...mapActions(useMovieStore, ['removeNoteFromStore']),
    showEdit(row: MovieNoteType): boolean {
      return row.user.id === this.user.id;
    },
    showCrown(row: MovieNoteType): boolean {
      return row.user.id === this.moviePage.selectedMovie.user_id;
    },
    showConfirmDialogDelete() {
      this.confirmDialogRef?.dialog('Quer mesmo excluir sua nota?', 'cancel', 'Confirme a exclusão', 'Deletar');
    },
    showConfirmPromptDelete() {
      this.confirmDialogPromptRef?.dialog();
    },
    async createNote(note: string) {
      const noteConverted = parseInt(note);
      if (typeof noteConverted !== 'number') {
        return false;
      }

      try {
        this.loading = true;
        const res = await MovieService.createMovieNote(noteConverted, this.movieId);
        this.moviePage.selectedMovie.notes?.push(res);
      } catch {
        this.showError('Erro ao cadastrar nota.');
      } finally {
        this.loading = false;
      }
    },
    async getMovieNotes() {
      if (!this.movieId) {
        return;
      }

      try {
        this.loading = true;
        const res = await MovieService.getMovieNotes(this.movieId);
        this.moviePage.selectedMovie.notes = res;
      } catch {
        this.showError('Erro ao buscar notas.');
      } finally {
        this.loading = false;
      }
    },
    async updateNote(row: MovieNoteType, note: string) {
      try {
        this.loading = true;

        const noteConvertedToNumber = parseInt(note);
        if (!noteConvertedToNumber) {
          return;
        }

        await MovieService.updateMovieNotes(noteConvertedToNumber, this.movieId);
        row.note = noteConvertedToNumber;
        this.showSuccess('Nota atualizada.');
      } catch {
        this.showError('Erro ao atualizar nota.');
      } finally {
        this.loading = false;
      }
    },
    async deleteNote() {
      try {
        this.loading = true;

        await MovieService.deleteMovieNotes(this.movieId);
        this.removeNoteFromStore(this.user.id);
        this.showSuccess('Nota deletada.');
      } catch {
        this.showError('Erro ao deletar nota.');
      } finally {
        this.loading = false;
      }
    },
    ruleInputNote(val: string) {
      const noteConvertedToNumber = parseInt(val);
      if (typeof noteConvertedToNumber !== 'number') {
        return false;
      }

      return noteConvertedToNumber <= 10 ? true : 'A nota pode ser no máximo 10.';
    },
    rulePopUp(val: string) {
      const noteConvertedToNumber = parseInt(val);
      if (typeof noteConvertedToNumber !== 'number') {
        return false;
      }

      return noteConvertedToNumber <= 10;
    },
  },
});
</script>
