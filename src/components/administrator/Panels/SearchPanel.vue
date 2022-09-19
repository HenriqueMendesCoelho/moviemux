<template>
  <div id="container-search" class="div-container">
    <div class="row div-panel">
      <h2>Buscas gerais</h2>
    </div>
  </div>
</template>

<script lang="ts">
import { useAdministratorStore } from '@/stores/AdministratorStore';
import { mapState } from 'pinia';
import { defineComponent } from 'vue-demi';

export default defineComponent({
  name: 'SearchPanel',
  computed: {
    ...mapState(useAdministratorStore, ['AdministratorSelectBar']),
  },
});
</script>

<style lang="scss" scoped>
@import '@/components/administrator/scss/AdministratorPanel.scss';
</style>
