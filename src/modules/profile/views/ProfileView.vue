<template>
  <BaseContainerMain>
    <div class="row q-mt-xl justify-center">
      <div class="row col-10 justify-center">
        <BasePageTitle title="Meu Perfil" icon="person" />
      </div>
      <div class="panel-profile col-xs-12 col-md-10 q-mt-xl">
        <q-tabs v-model="tab" class="tabs-selector" active-color="kb-primary" indicator-color="kb-primary" align="justify" dense>
          <q-tab class="tab-style-right" name="myData" label="Meus Dados" icon="badge" />
          <q-tab class="tab-style-right" name="security" label="Segurança" icon="lock" />
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
  </BaseContainerMain>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
export default defineComponent({
  name: 'ProfilePage',
});
</script>

<script lang="ts" setup>
import { ref } from 'vue';

import BaseContainerMain from 'src/core/components/BaseContainerMain.vue';
import PanelSecurityProfile from '../components/PanelSecurityProfile.vue';
import PanelProfile from '../components/PanelProfile.vue';
import BasePageTitle from 'src/core/components/BasePageTitle.vue';

const tab = ref('myData');
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

    @media only screen and (max-width: $breakpoint-md-min) {
      border-right: none;
    }
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
