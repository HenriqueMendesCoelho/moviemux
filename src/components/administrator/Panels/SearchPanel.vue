<template>
  <div id="container-search" class="div-container">
    <div class="row div-panel">
      <h2>Buscas gerais</h2>
      <div class="q-mt-md">
        <div class="col-12">
          <TableNoHeader style="width: 100%" :title="'Notas'" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { useAdministratorStore } from '@/stores/AdministratorStore';
import { mapState } from 'pinia';
import { defineComponent } from 'vue-demi';
import TableNoHeader from '@/components/shared/tableNoHeader/TableNoHeader.vue';

export default defineComponent({
  name: 'SearchPanel',
  components: {
    TableNoHeader,
  },
  computed: {
    ...mapState(useAdministratorStore, ['AdministratorSelectBar']),
  },
});
</script>

<style lang="scss" scoped>
@import '@/components/administrator/scss/AdministratorPanel.scss';
</style>
