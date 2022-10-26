<template>
  <main>
    <AdministratorSelectBarVue />
    <UserManagerPanel v-show="AdministratorSelectBar.panel_access" />
    <InviteCodePanelVue v-show="AdministratorSelectBar.panel_invite" />
    <SearchPanelVue v-show="AdministratorSelectBar.panel_searchs" />
  </main>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapState } from 'pinia';
import { useStyleStore } from '@/stores/StyleStore';
import { useAdministratorStore } from '@/stores/AdministratorStore';
import CustomAlerts from '@/domain/alerts/CustomAlerts';
import UserManagerPanel from '@/components/administrator/Panels/UserManagerPanel.vue';
import AdministratorSelectBarVue from './Panels/AdministratorSelectBar.vue';
import InviteCodePanelVue from './Panels/InviteCodePanel.vue';
import SearchPanelVue from './Panels/SearchPanel.vue';

export default defineComponent({
  name: 'ADministratorApp',
  components: {
    UserManagerPanel,
    AdministratorSelectBarVue,
    InviteCodePanelVue,
    SearchPanelVue,
  },
  setup() {
    document.title = 'Cineminha - ADM';
  },
  data() {
    return {
      customAlert: new CustomAlerts(),
      loop: false,
      invites: [],
      invite: {},
    };
  },
  computed: {
    ...mapState(useStyleStore, ['getMarginSideBar']),
    ...mapState(useAdministratorStore, ['AdministratorSelectBar']),
  },
  mounted() {
    if (this.loop) {
      window.setInterval(() => {
        //Metodo para fazer a cada 5 seg
      }, 5000);
    }
  },
  methods: {
    /*
        createInvite() {
            //API CALL CODE
            //let random = Math.floor(Math.random() * 999999 + 100000);
        },*/
  },
});
</script>

<style lang="scss" scoped>
@import '@/components/administrator/scss/AdministratorPanel.scss';
main {
  margin-left: v-bind(getMarginSideBar);
}
</style>
