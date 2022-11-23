<template>
  <ContainerMain>
    <div :class="isMobile ? 'column q-gutter-y-md' : 'row'" v-if="showTopButtons()">
      <div class="q-ml-md">
        <q-btn style="background-color: #343c4c" text-color="white" round icon="refresh" />
      </div>
      <div class="q-ml-md" v-if="!isEditing">
        <q-btn
          style="width: 100%"
          color="primary"
          text-color="white"
          label="Editar"
          :disable="cantEdit()"
          @click="isEditing = !isEditing"
        />
        <q-tooltip v-if="cantEdit()"> O filme não foi cadastrado por você </q-tooltip>
      </div>
      <div class="q-ml-md">
        <q-btn v-if="true" style="width: 100%" color="red" text-color="white" label="Deletar" />
      </div>
      <SeparatorDivSolidLine />
    </div>
    <div class="container-main">
      <div class="container-infos-img">
        <img
          :src="
            selectedMovie.image
              ? selectedMovie.image
              : 'https://cdn.discordapp.com/attachments/713552377348882434/987853775450566666/unknown.png'
          "
          :alt="selectedMovie.titleEn ? selectedMovie.titleEn : 'placeholder'"
          draggable="false"
        />

        <div class="row movie-infos-inputs">
          <p class="paragrafy-title-info">Informações</p>
          <SeparatorDiv />
          <div class="col-12">
            <InputText :label="'Título PT-BR'" v-model="selectedMovie.titleBr" :readOnly="!isRegisterOrEditing()" />
          </div>
          <div class="col-12">
            <InputText :label="'Título EN'" v-model="selectedMovie.titleEn" :readOnly="!isRegisterOrEditing()" />
          </div>
          <div class="col-12">
            <InputText :label="'Ano de lançamento'" v-model="selectedMovie.year" :readOnly="!isRegisterOrEditing()" :mask="'####'" />
          </div>
          <div class="col-12">
            <InputText :label="'Diretor'" v-model="selectedMovie.director" :readOnly="!isRegisterOrEditing()" />
          </div>
          <div class="col-12">
            <InputText :label="'URL da Imagem'" v-model="selectedMovie.image" :readOnly="!isRegisterOrEditing()" />
          </div>
          <div class="col-12">
            <InputText :label="'URL do trailer dublado'" v-model="selectedMovie.trailerBr" :readOnly="!isRegisterOrEditing()" />
          </div>
          <div class="col-12">
            <InputText :label="'URL do trailer legendado'" v-model="selectedMovie.trailerEn" :readOnly="!isRegisterOrEditing()" />
          </div>
        </div>
      </div>
      <SeparatorDivSolidLine />
      <div class="container-notes-trailers">
        <div class="row movie-notes justify-center q-px-lg">
          <div class="div-textarea col-6 q-pr-xs mobile-movie-notes">
            <q-input
              standout="text-info"
              color="info"
              outlined
              v-model="selectedMovie.description"
              input-style="resize: none;"
              rows="9"
              label="Descrição - Sinopse"
              bg-color="grey-1"
              dark
              type="textarea"
              :readonly="!isRegisterOrEditing()"
              :rules="[(val) => !!val || '*Obrigatório']"
            />
          </div>
          <div class="col-6 q-pl-xs mobile-movie-notes" v-if="!isRegisterOrEditing()">
            <TableEditDelete :title="'Notas'" style="max-height: 200px" :columns="columns" :rows="mock" />
          </div>
        </div>
        <div class="row movie-trailers justify-center" v-if="selectedMovie.trailerBr || selectedMovie.trailerEn">
          <SeparatorDivSolidLine />
          <div class="column items-center" v-if="selectedMovie.trailerBr">
            <h6>Trailer Dublado</h6>
            <VideoEmbedded :width="isMobile ? '100%' : '560px'" :url="selectedMovie.trailerBr" />
          </div>
          <SeparatorDivLineSolidVertical v-if="!isMobile && selectedMovie.trailerBr && selectedMovie.trailerEn" />
          <div class="column items-center" v-if="selectedMovie.trailerEn">
            <h6>Trailer Legendado</h6>
            <VideoEmbedded :width="isMobile ? '100%' : '560px'" :url="selectedMovie.trailerEn" />
          </div>
        </div>
      </div>
      <SeparatorDivSolidLine />
      <div class="row justify-center" v-if="isRegisterOrEditing()">
        <div :class="isMobile ? 'col-4' : 'col-2'">
          <q-btn style="width: 100%" color="positive" text-color="white" label="Salvar" :disable="false" @click="isEditing = !isEditing" />
        </div>
        <div :class="isMobile ? 'col-4 q-ml-md' : 'col-2 q-ml-md'">
          <q-btn style="width: 100%" color="red" text-color="white" label="Cancelar" :disable="false" @click="cancel()" />
        </div>
      </div>
    </div>
  </ContainerMain>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapActions, mapState } from 'pinia';
import { useStyleStore } from '@/stores/StyleStore';
import { useMovieStore } from '@/stores/MovieStore';
import { RouteRecordName } from 'vue-router';
import type { QTableProps } from 'quasar';

import ContainerMain from '../shared/containerMain/ContainerMain.vue';
import TableEditDelete from '@/components/shared/tables/TableEditDelete.vue';
import SeparatorDiv from '@/components/shared/separator/SeparatorDiv.vue';
import SeparatorDivSolidLine from '@/components/shared/separator/SeparatorDivLineSolid.vue';
import SeparatorDivLineSolidVertical from '../shared/separator/SeparatorDivLineSolidVertical.vue';
import VideoEmbedded from './videoEmbedded/VideoEmbedded.vue';
import InputText from '../shared/inputText/InputText.vue';

import CustomAlerts from '@/domain/alerts/CustomAlerts';

export default defineComponent({
  name: 'MoviePage',
  components: {
    ContainerMain,
    SeparatorDiv,
    TableEditDelete,
    SeparatorDivSolidLine,
    SeparatorDivLineSolidVertical,
    VideoEmbedded,
    InputText,
  },
  setup() {
    const customAlert = new CustomAlerts();

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
      customAlert,
      columns,
    };
  },
  data() {
    return {
      idPathParam: this.$route.params.id,
      notesVisible: true,
      isEditing: false,
      alreadyEditing: false,
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
    ...mapState(useStyleStore, ['getMarginSideBar']),
    ...mapState(useMovieStore, ['selectedMovie', 'allMovies']),
    routeName(): RouteRecordName | null | undefined {
      return this.$route.name;
    },
    routeIDPath(): string | string[] {
      return this.$route.params.id;
    },
    isMobile(): boolean | undefined {
      return this.$q.platform.is.mobile;
    },
  },
  mounted() {
    this.resetStoreMovie();
    if (this.routeName === 'add') {
      document.title = 'Cineminha - Cadastrar Filme';
    } else {
      document.title = `Cineminha - Filme ${this.routeIDPath}`;
    }
  },
  updated() {
    if (this.routeName === 'add') {
      if (!this.alreadyEditing) this.resetStoreMovie();

      this.alreadyEditing = true;
      this.idPathParam = '';

      document.title = 'Cineminha - Cadastrar Filme';
    } else {
      document.title = `Cineminha - Filme ${this.routeIDPath}`;
    }
  },
  methods: {
    ...mapActions(useMovieStore, ['resetStoreMovie']),
    isRegisterOrEditing() {
      if (!this.routeIDPath) {
        return true;
      }
      if (this.routeIDPath && this.isEditing) {
        return true;
      }
      return false;
    },
    showTopButtons() {
      return this.routeName === 'movie';
    },
    save() {
      return;
    },
    cancel() {
      this.customAlert.customAlert('Deseja mesmo cancelar?', 'Todos os dados preenchidos serão apagados', true, '').then((res) => {
        if (res.isConfirmed) {
          this.isEditing = false;
          if (this.idPathParam) {
            //TODO: Chamar api para pegar dados novamente pelo id do path
            return;
          }
          this.resetStoreMovie();
        }
      });
    },
    cantEdit() {
      return false;
    },
    copyMovieURL(url?: string) {
      if (url) navigator.clipboard.writeText(url);
    },
  },
});
</script>

<style lang="scss" scoped>
.container-main {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: auto;

  color: white;
  background: var(--grey-dark2);

  .container-infos-img {
    display: flex;
    height: 60vh;
    overflow: hidden;
    padding: 15px 15px;

    img {
      border-radius: 20px;
      height: 100%;

      @media (max-width: 768px) {
        height: auto;
      }
    }

    @media (max-width: 768px) {
      flex-direction: column;
      height: auto;
      padding: 0px;
    }

    .paragrafy-title-info {
      font-size: 50pt;

      @media (max-width: 768px) {
        font-size: x-large;
      }
    }

    .movie-infos-inputs {
      display: flex;
      flex-wrap: wrap;
      text-align: flex-start;
      justify-content: flex-start;
      width: 100%;
      height: 100%;
      margin-left: 10px;
      overflow-y: auto;
      padding-right: 10px;
    }
  }
  .container-notes-trailers {
    //border: solid 5px yellow;
    height: auto;

    .movie-notes {
      @media (max-width: 768px) {
        padding: 0px;
      }

      .div-textarea {
        overflow: hidden;
        max-height: 200px;

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

    .movie-trailers {
      @media (max-width: 768px) {
        max-width: 100%;
        overflow: hidden;
      }
    }
  }
}
</style>
