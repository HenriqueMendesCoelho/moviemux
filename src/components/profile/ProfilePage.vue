<template>
  <ContainerMain>
    <div class="row q-mt-xl justify-center">
      <div class="row col-10 justify-center">
        <div>
          <h2 style="color: white">Meu Perfil</h2>
        </div>
      </div>
      <div class="panel-profile q-mt-xl" :class="isMobile ? 'col-12' : 'col-10'">
        <q-tabs v-model="tab" class="tabs-selector" active-color="info" indicator-color="info" align="justify" dense>
          <q-tab :class="isMobile ? '' : 'tab-style-right'" name="myData" label="Meus Dados" icon="badge" />
          <q-tab :class="isMobile ? '' : 'tab-style-right'" name="security" label="Segurança" icon="lock" />
        </q-tabs>
        <q-tab-panels v-model="tab" animated class="tabs q-pt-md">
          <q-tab-panel name="myData">
            <div class="row justify-center" :class="isMobile ? 'q-pt-xs' : 'q-pt-md'">
              <h5>Alteração dados pessoais</h5>
              <SeparatorDivLineSolid />
              <PanelUserInfo class="q-mt-md" v-model="myData" />
            </div>
          </q-tab-panel>
          <q-tab-panel name="security">
            <PanelSecurityProfile />
          </q-tab-panel>
        </q-tab-panels>
      </div>
    </div>
  </ContainerMain>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapState } from 'pinia';

import { useStyleStore } from '@/stores/StyleStore';

import ContainerMain from '../shared/containerMain/ContainerMain.vue';
import PanelUserInfo from '../shared/panelUserInfo/PanelUserInfo.vue';
import PanelSecurityProfile from './panelSecurityProfile/PanelSecurityProfile.vue';
import SeparatorDivLineSolid from '@/components/shared/separator/SeparatorDivLineSolid.vue';

//:class="{ active: AdministratorSelectBar.panel_access }"

export default defineComponent({
  name: 'ProfileApp',
  components: {
    ContainerMain,
    PanelUserInfo,
    PanelSecurityProfile,
    SeparatorDivLineSolid,
  },
  setup() {
    document.title = 'Cineminha - Meu Dados';
  },
  data() {
    return {
      changePanels: true,
      tab: 'myData',
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
    isMobile(): boolean | undefined {
      return this.$q.platform.is.mobile;
    },
  },
  watch: {
    tab(val) {
      if (val !== 'myData') {
        document.title = 'Cineminha - Segurança';
        return;
      }
    },
  },
});
</script>

<style lang="scss" scoped>
:deep(.q-tab__label) {
  font-size: 12pt;
}

.tabs-selector {
  //background: var(--grey-mid);
  background-color: var(--dark-alt);
  color: white;
  box-shadow: 0 5px 10px var(--shadow);
  border-top-right-radius: 15px;
  border-top-left-radius: 15px;
  font-size: x-large;
  //border: 1px solid white;

  .tab-style-right {
    border-right: 3px solid var(--grey-mid);
  }
}

.tabs {
  background: var(--grey-mid);
  color: white;
  box-shadow: 0 5px 10px var(--shadow);
  border-bottom-left-radius: 15px;
  border-bottom-right-radius: 15px;
}
</style>
