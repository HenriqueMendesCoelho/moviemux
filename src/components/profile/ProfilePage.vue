<template>
  <ContainerMain>
    <div class="row q-mt-xl justify-center">
      <div class="row col-10 justify-center">
        <div>
          <h2 style="color: white">Meu Perfil</h2>
        </div>
      </div>
      <div class="panel-profile q-mt-xl" :class="isMobile ? 'col-12' : 'col-10'">
        <SelectPanelBar />
        <div :class="isMobile ? 'q-pt-xs' : 'q-pt-xl'">
          <PanelUserInfo v-if="ProfileSelectBar.PanelMyData" v-model="myData" />
        </div>

        <div class="PanelSecurity row q-pt-xl justify-center" v-if="ProfileSelectBar.PanelSecurity">
          <div class="q-mt-md" :class="isMobile ? 'col-12' : 'col-8'">
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
          <div class="q-mt-md" :class="isMobile ? 'col-12' : 'col-8'">
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
          <div class="q-mt-md q-mb-xl" :class="isMobile ? 'col-12' : 'col-8'">
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
  </ContainerMain>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapState } from 'pinia';

import { useStyleStore } from '@/stores/StyleStore';
import { useProfileStore } from '@/stores/ProfileStore';

import ContainerMain from '../shared/containerMain/ContainerMain.vue';
import SelectPanelBar from '@/components/profile/selectPanelBar/SelectPanelProfileBar.vue';
import PanelUserInfo from '../shared/panelUserInfo/PanelUserInfo.vue';

//:class="{ active: AdministratorSelectBar.panel_access }"

export default defineComponent({
  name: 'ProfileApp',
  components: {
    ContainerMain,
    SelectPanelBar,
    PanelUserInfo,
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
        dtCreated: new Date(Date.now()),
        qtdMovies: 10,
        qtdNotes: 10,
      },
    };
  },
  computed: {
    ...mapState(useStyleStore, ['getMarginSideBar']),
    ...mapState(useProfileStore, ['ProfileSelectBar']),
    isMobile(): boolean | undefined {
      return this.$q.platform.is.mobile;
    },
  },
});
</script>

<style lang="scss">
.panel-profile {
  background: var(--grey-mid);
  height: auto;
  border-radius: 15px;

  box-shadow: 0 5px 10px var(--shadow);
}
</style>
