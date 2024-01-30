<template>
  <ContainerMain>
    <div class="row q-mt-xl justify-center">
      <div class="row col-10 justify-center">
        <PageTitle title="Menu Administrativo" icon="admin_panel_settings" />
      </div>
      <div class="col-md-10 col-xs-12 q-my-xl">
        <q-tabs v-model="tab" class="tabs-selector" active-color="kb-primary" indicator-color="kb-primary" align="justify">
          <q-tab class="tab-style-right" name="users" label="Gerenciamento Usuário" />
          <q-tab class="tab-style-right" name="listUsers" label="Lista de Usuários" />
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

<script lang="ts" setup>
import { ref } from 'vue';

import ContainerMain from '../shared/containerMain/ContainerMain.vue';
import UserTabAdministrator from './userTab/UserTabAdministrator.vue';
import ListUserTabAdministrator from './listUserTab/ListUserTabAdministrator.vue';
import InviteUserTabAdmiminstrator from './inviteTab/InviteUserTabAdministrator.vue';
import PageTitle from '../shared/pageTitle/PageTitle.vue';

const tab = ref('users');
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
