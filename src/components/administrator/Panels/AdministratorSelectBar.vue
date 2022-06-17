<template>
  <div class="panel-navigation">
    <button
      :class="{ active: AdministratorSelectBar.panel_access }"
      class="btn-left-bordered"
      @click="setPanelsVisibility(true, false, false)"
    >
      Gerencimento usuários
    </button>
    <button
      :class="{ active: AdministratorSelectBar.panel_invite }"
      @click="setPanelsVisibility(false, true, false)"
    >
      Códigos de convite
    </button>
    <button
      :class="{ active: AdministratorSelectBar.panel_searchs }"
      class="btn-right-bordered"
      @click="setPanelsVisibility(false, false, true)"
    >
      Buscas
    </button>
  </div>
</template>

<script lang="ts">
import { useAdministratorStore } from "@/stores/AdministratorStore";
import { mapActions, mapState } from "pinia";
export default {
  computed: {
    ...mapState(useAdministratorStore, ["AdministratorSelectBar"]),
  },
  methods: {
    ...mapActions(useAdministratorStore, ["setPanelsVisibility"]),
  },
};
</script>

<style lang="scss" scoped>
@import "@/components/administrator/scss/AdministratorPanel.scss";
</style>
