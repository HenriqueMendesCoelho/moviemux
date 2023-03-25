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
            <PanelProfile />
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

import ContainerMain from '../shared/containerMain/ContainerMain.vue';
import PanelSecurityProfile from './panelSecurityProfile/PanelSecurityProfile.vue';
import PanelProfile from './panelProfile/PanelProfile.vue';

export default defineComponent({
  name: 'ProfileApp',
  components: {
    ContainerMain,
    PanelSecurityProfile,
    PanelProfile,
  },
  data() {
    return {
      tab: 'myData',
    };
  },
  computed: {
    isMobile(): boolean | undefined {
      return this.$q.platform.is.mobile;
    },
  },
});
</script>

<style lang="scss" scoped>
:deep(.q-tab__label) {
  font-size: 12pt;
}

.tabs-selector {
  background-color: var(--dark-alt);
  color: white;
  box-shadow: 0 5px 10px var(--shadow);
  border-top-right-radius: 15px;
  border-top-left-radius: 15px;
  font-size: x-large;

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
