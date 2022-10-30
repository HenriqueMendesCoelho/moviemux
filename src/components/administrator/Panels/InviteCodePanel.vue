<template>
  <div id="container-invite" class="div-container">
    <div id="div-panel-invite" class="div-panel">
      <h3>Convites</h3>
      <div class="container-subpanel-invite">
        <div class="textfield-buttons textfield-buttons-invites">
          <button
            id="btn-create-invites"
            :class="{ active: InviteCodePanel.panel_invite_create }"
            class="button-std btn-left-bordered"
            @click="setInvitePanelsVisibility(true, false)"
          >
            Criar convite
          </button>
          <button
            id="btn-search-invites"
            :class="{ active: InviteCodePanel.panel_invite_search }"
            class="button-std btn-right-bordered"
            @click="setInvitePanelsVisibility(false, true)"
          >
            Buscar convites criados
          </button>
        </div>
        <div
          class="panel-create-invite"
          v-show="InviteCodePanel.panel_invite_create && !InviteCodePanel.panel_invite_search"
        >
          <div class="code-invite">
            <h4>KB-564545</h4>
          </div>
          <q-btn class="btn btn-success" type="submit" color="positive" label="Criar convite" />
        </div>
        <div
          class="panel-create-invite"
          v-show="!InviteCodePanel.panel_invite_create && InviteCodePanel.panel_invite_search"
        >
          <!--v-for="invite in invites"
                            :key="invite.id"-->
          <div class="div-invites-search">
            <h4>KB-994949</h4>
            <div class="flex"></div>
            <button class="btn btn-danger" @click="deleteInvite">DELETAR</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { mapActions, mapState } from 'pinia';
import { useAdministratorStore } from '@/stores/AdministratorStore';
import { defineComponent } from 'vue';
import CustomAlerts from '@/domain/alerts/CustomAlerts';
export default defineComponent({
  name: 'InviteCodePanel',
  data() {
    return {
      customAlert: new CustomAlerts(),
    };
  },
  computed: {
    ...mapState(useAdministratorStore, ['InviteCodePanel']),
  },
  methods: {
    ...mapActions(useAdministratorStore, ['setInvitePanelsVisibility']),
    deleteInvite() {
      this.customAlert.toastAlert('Convite deletado', 'success');
    },
  },
});
</script>

<style lang="scss" scoped>
@import '@/components/administrator/scss/AdministratorPanel.scss';
</style>
