<template>
  <div class="row justify-center q-gutter-y-md">
    <h5>Gerenciamento do usuário</h5>
    <SeparatorDivLineSolid />
    <div class="col-10 q-mt-md">
      <InputText :label="'E-mail usuário alvo'" v-model="email" :required="false" :dense="true" />
    </div>
    <div class="col-6 q-pt-md">
      <q-btn-group>
        <q-btn color="info" label="Buscar usuário" />
        <q-btn color="positive" label="Promover Usuário" />
        <q-btn color="dark" label="Rebaixar usuário" />
        <q-btn color="accent" label="Bloquear usuário" />
        <q-btn color="negative" label="Deletar usuário" />
      </q-btn-group>
    </div>
    <div class="col-10 q-pt-md">
      <PanelUserInfo :allReadOnly="true" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import PanelUserInfo from '@/components/shared/panelUserInfo/PanelUserInfo.vue';
import InputText from '@/components/shared/inputText/InputText.vue';
import SeparatorDivLineSolid from '@/components/shared/separator/SeparatorDivLineSolid.vue';

export default defineComponent({
  name: 'UserTabAdministrator',
  components: {
    PanelUserInfo,
    InputText,
    SeparatorDivLineSolid,
  },
  data() {
    return {
      email: '',
    };
  },
});
</script>

<style lang="scss"></style>
