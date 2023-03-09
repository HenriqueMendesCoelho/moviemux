<template>
  <div class="row movie-notes justify-center q-px-lg">
    <div class="div-textarea col-6 q-pr-xs mobile-movie-notes">
      <q-input
        class="q-my-xs"
        standout="text-info"
        color="info"
        outlined
        v-model="moviePage.selectedMovie.description"
        input-style="resize: none;"
        rows="9"
        label="Descrição - Sinopse"
        bg-color="grey-1"
        dark
        type="textarea"
        :readonly="!isRegisterOrEditing"
        :rules="[(val) => !!val || '*Obrigatório']"
      />
    </div>
    <div class="col-6 q-pl-xs mobile-movie-notes" v-if="!isRegisterOrEditing">
      <TableEditDelete :title="'Notas'" style="max-height: 200px" :columns="columns" :rows="mock" />
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue';
import type { QTableProps } from 'quasar';
import { mapState } from 'pinia';

import { useMovieStore } from '@/stores/MovieStore';

import TableEditDelete from '@/components/shared/tables/TableEditDelete.vue';

export default defineComponent({
  name: 'NotesDescription',
  components: { TableEditDelete },
  props: {
    isRegisterOrEditing: {
      type: Boolean,
    },
  },
  setup() {
    const columns: QTableProps['columns'] = [
      {
        name: 'nome',
        label: 'Nome',
        field: 'name',
        align: 'left',
      },
      {
        name: 'nota',
        label: 'Nota',
        field: 'note',
        align: 'center',
      },
      {
        name: 'data',
        label: 'Data',
        field: 'data',
        align: 'center',
      },
      {
        name: 'actions',
        label: 'Ações',
        field: '',
        align: 'center',
      },
    ];
    return {
      columns,
    };
  },
  data() {
    return {
      mock: [
        {
          name: 'Henrique',
          note: 9,
          data: '18/09/2022 19:50:55',
        },
        {
          name: 'Yuri Boga',
          note: 7,
          data: '18/09/2022 19:50:55',
        },
        {
          name: 'Juan Boga',
          note: 7,
          data: '18/09/2022 19:50:55',
        },
      ],
    };
  },
  computed: {
    ...mapState(useMovieStore, ['moviePage']),
  },
});
</script>
<style lang="scss" scoped>
.movie-notes {
  @media (max-width: 768px) {
    padding: 0px;
  }

  .div-textarea {
    overflow: hidden;
    transition: 0.2s ease-in-out;

    @media (max-width: 768px) {
      padding: 0px;
      min-width: 100%;
    }
  }

  .mobile-movie-notes {
    margin-top: 20px;

    @media (max-width: 768px) {
      width: 100%;
      justify-content: center;
      align-content: center;
    }
  }
}
</style>
