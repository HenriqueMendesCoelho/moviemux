import { defineStore } from "pinia";

import testService from "@/components/services/testService";

export const useAdministratorStore = defineStore("AdministratorStore", {
  state: () => {
    return {
      inviteCode: "",
      AdministratorSelectBar: {
        panel_access: true,
        panel_invite: false,
        panel_searchs: false,
      },
      InviteCodePanel: {
        panel_invite_create: true,
        panel_invite_search: false,
      },
    };
  },
  actions: {
    async generateRandomNumber() {
      return await testService.randomNumber;
    },
    setPanelsVisibility(
      panel_access: boolean,
      panel_invite: boolean,
      panel_searchs: boolean
    ) {
      this.AdministratorSelectBar.panel_access = panel_access;
      this.AdministratorSelectBar.panel_invite = panel_invite;
      this.AdministratorSelectBar.panel_searchs = panel_searchs;
    },
    setInvitePanelsVisibility(
      panel_invite_create: boolean,
      panel_invite_search: boolean
    ) {
      this.InviteCodePanel.panel_invite_create = panel_invite_create;
      this.InviteCodePanel.panel_invite_search = panel_invite_search;
    },
  },
});
