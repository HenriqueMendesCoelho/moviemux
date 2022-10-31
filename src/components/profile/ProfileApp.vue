<template>
  <main>
    <div class="row q-mt-xl justify-center">
      <div class="row col-10 justify-center">
        <div>
          <h2 style="color: white">Meu Perfil</h2>
        </div>
      </div>
      <div class="panel-profile q-mt-xl" :class="$q.platform.is.mobile ? 'col-12' : 'col-10'">
        <SelectPanelBar />
        <div
          class="PanelmyData row justify-center"
          :class="$q.platform.is.mobile ? 'q-pt-xs' : 'q-pt-xl'"
          v-if="ProfileSelectBar.PanelMyData"
        >
          <div class="q-mt-md" :class="$q.platform.is.mobile ? 'col-12' : 'col-8'">
            <q-input
              standout="text-info"
              color="info"
              outlined
              v-model="myData.name"
              label="Nome"
              style="background-color: #343c4c"
              dark
            />
          </div>
          <div class="q-mt-md" :class="$q.platform.is.mobile ? 'col-12' : 'col-8'">
            <q-input
              standout="text-info"
              color="info"
              outlined
              v-model="myData.email"
              label="Email"
              style="background-color: #343c4c"
              dark
            />
          </div>
          <div class="q-mt-md" :class="$q.platform.is.mobile ? 'col-12' : 'col-8'">
            <q-input
              standout="text-info"
              color="info"
              outlined
              v-model="myData.accessProfile"
              label="Perfil de Acesso"
              style="background-color: #343c4c"
              dark
              :readonly="true"
            />
          </div>
          <div class="q-mt-md q-mb-xl" :class="$q.platform.is.mobile ? 'col-12' : 'col-8'">
            <div class="row">
              <div :class="$q.platform.is.mobile ? 'col-12' : 'col-6 q-pr-sm'">
                <q-input
                  square
                  filled
                  standout="text-info"
                  color="info"
                  v-model="myData.qtdMovies"
                  label="Quantidade de filmes cadastrados"
                  dark
                  :readonly="true"
                />
              </div>
              <div :class="$q.platform.is.mobile ? 'col-12 q-mt-md' : 'col-6 q-pl-sm'">
                <q-input
                  square
                  filled
                  standout="text-info"
                  color="info"
                  v-model="myData.qtdNotes"
                  label="Quantidade de notas cadastrados"
                  dark
                  :readonly="true"
                  draggable="false"
                />
              </div>
            </div>
          </div>
        </div>
        <div class="PanelSecurity row q-pt-xl justify-center" v-if="ProfileSelectBar.PanelSecurity">
          <div class="q-mt-md" :class="$q.platform.is.mobile ? 'col-12' : 'col-8'">
            <q-input
              standout="text-info"
              color="info"
              outlined
              v-model="myData.name"
              label="Senha atual"
              style="background-color: #343c4c"
              dark
              type="password"
            />
          </div>
          <div class="q-mt-md" :class="$q.platform.is.mobile ? 'col-12' : 'col-8'">
            <q-input
              standout="text-info"
              color="info"
              outlined
              v-model="myData.name"
              label="Nova Senha"
              style="background-color: #343c4c"
              dark
              type="password"
            />
          </div>
          <div class="q-mt-md q-mb-xl" :class="$q.platform.is.mobile ? 'col-12' : 'col-8'">
            <q-input
              standout="text-info"
              color="info"
              outlined
              v-model="myData.name"
              label="Confirme Nova Senha"
              style="background-color: #343c4c"
              dark
              type="password"
            />
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapState } from 'pinia';

import { useStyleStore } from '@/stores/StyleStore';
import { useProfileStore } from '@/stores/ProfileStore';

import SelectPanelBar from '@/components/profile/selectPanelBar/SelectPanelProfileBar.vue';

//:class="{ active: AdministratorSelectBar.panel_access }"

export default defineComponent({
  name: 'ProfileApp',
  components: {
    SelectPanelBar,
  },
  setup() {
    document.title = 'Cineminha - Meu Perfil';
  },
  data() {
    return {
      changePanels: true,
      myData: {
        name: '',
        email: '',
        accessProfile: 'ADMIN',
        qtdMovies: 10,
        qtdNotes: 10,
      },
    };
  },
  computed: {
    ...mapState(useStyleStore, ['getMarginSideBar']),
    ...mapState(useProfileStore, ['ProfileSelectBar']),
  },
});
</script>

<style lang="scss">
main {
  display: flex;
  flex-direction: column;
  margin-top: 1.5rem;

  margin-left: v-bind(getMarginSideBar);
  max-width: 100%;
  min-height: 100vh;

  transition: 0.2s ease-out;

  overflow: hidden;

  border-top-left-radius: 10px;
  background: var(--grey-dark2);
  box-shadow: 0 10px 30px var(--shadow);

  @media (max-width: 768px) {
    margin-left: calc(4rem + 32px);
  }

  .panel-profile {
    background: var(--grey-mid);
    height: auto;
    border-radius: 15px;

    box-shadow: 0 5px 10px var(--shadow);
  }
}
</style>
