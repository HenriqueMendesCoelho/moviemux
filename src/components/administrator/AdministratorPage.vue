<template>
  <ContainerMain>
    <div class="row q-mt-xl justify-center">
      <div class="row col-10 justify-center">
        <div>
          <h2 style="color: white">Menu Administrativo</h2>
        </div>
      </div>
      <div :class="isMobile ? 'col-12 q-my-xl' : 'col-10 q-my-xl'">
        <q-tabs v-model="tab" class="tabs-selector" active-color="info" indicator-color="info" align="justify">
          <q-tab :class="isMobile ? '' : 'tab-style-right'" name="users" label="Gerenciamento Usuário" />
          <q-tab :class="isMobile ? '' : 'tab-style-right'" name="listUsers" label="Lista de Usuários" />
          <q-tab name="invite" label="Gerencimento de Convite" />
        </q-tabs>

        <q-tab-panels v-model="tab" animated class="tabs q-pt-sm" style="min-height: 580px">
          <q-tab-panel name="users">
            <UserTabAdministrator />
          </q-tab-panel>
          <q-tab-panel name="listUsers">
            <ListUserTabAdministrator />
          </q-tab-panel>
          <q-tab-panel name="invite">
            <InviteUserTabAdmiminstrator />
          </q-tab-panel>
        </q-tab-panels>
      </div>
    </div>
  </ContainerMain>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapState } from 'pinia';

import ContainerMain from '../shared/containerMain/ContainerMain.vue';
import UserTabAdministrator from './userTab/UserTabAdministrator.vue';
import ListUserTabAdministrator from './listUserTab/ListUserTabAdministrator.vue';
import InviteUserTabAdmiminstrator from './inviteTab/InviteUserTabAdministrator.vue';

import { useStyleStore } from '@/stores/StyleStore';

export default defineComponent({
  name: 'AdministratorPage',
  components: { ContainerMain, UserTabAdministrator, ListUserTabAdministrator, InviteUserTabAdmiminstrator },
  setup() {
    document.title = 'Cineminha - ADM';
  },
  data() {
    return {
      tab: 'users',
    };
  },
  computed: {
    ...mapState(useStyleStore, ['getMarginSideBar']),

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
