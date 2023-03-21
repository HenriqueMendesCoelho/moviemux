<template>
  <ContainerMain>
    <div class="row q-mt-xl justify-center">
      <div class="row col-10 justify-center">
        <div class="text-h2" style="color: white">Meu Perfil</div>
      </div>
      <div class="panel-profile q-mt-xl" :class="isMobile ? 'col-12' : 'col-10'">
        <q-tabs v-model="tab" class="tabs-selector" active-color="kb-primary" indicator-color="kb-primary" align="justify" dense>
          <q-tab :class="isMobile ? '' : 'tab-style-right'" name="myData" label="Meus Dados" icon="badge" />
          <q-tab :class="isMobile ? '' : 'tab-style-right'" name="security" label="Segurança" icon="lock" />
        </q-tabs>
        <q-tab-panels v-model="tab" animated class="tabs q-pt-md" style="min-height: 500px">
          <q-tab-panel name="myData">
            <div class="row justify-center" :class="isMobile ? 'q-pt-xs' : 'q-pt-md'">
              <h5>Dados pessoais</h5>
              <SeparatorDivLineSolid />

              <PanelUserInfo class="col-12 q-mt-md" v-model="user" />
              <div class="row justify-center full-width">
                <div class="col-12" />
                <div :class="isMobile ? 'col-4' : 'col-2'">
                  <q-btn style="width: 100%" color="positive" text-color="white" label="Salvar" />
                </div>
                <div :class="isMobile ? 'col-4 q-ml-md' : 'col-2 q-ml-md q-mb-sm'">
                  <q-btn style="width: 100%" color="red" text-color="white" label="Cancelar" />
                </div>
              </div>
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

import User from '@/domain/user/User';

import UserService from '@/services/UserService';

import ContainerMain from '../shared/containerMain/ContainerMain.vue';
import PanelUserInfo from '../shared/panelUserInfo/PanelUserInfo.vue';
import PanelSecurityProfile from './panelSecurityProfile/PanelSecurityProfile.vue';
import SeparatorDivLineSolid from '@/components/shared/separator/SeparatorDivLineSolid.vue';

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
      tab: 'myData',
      user: {} as User,
    };
  },
  async mounted() {
    await this.loadUser();
  },
  computed: {
    ...mapState(useStyleStore, ['getMarginSideBar']),
    isMobile(): boolean | undefined {
      return this.$q.platform.is.mobile;
    },
  },
  methods: {
    async loadUser() {
      const res = await UserService.getUser();
      this.user = res;
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
