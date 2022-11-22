<template>
  <div class="row justify-center q-gutter-y-md">
    <div class="col-10 q-mt-md">
      <InputText :label="'E-mail usuário alvo'" v-model="email" :required="true" :customRules="rules" />
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
import InputText from '@/components/shared/InputText/InputText.vue';

export default defineComponent({
  name: 'UserTabAdministrator',
  components: {
    PanelUserInfo,
    InputText,
  },
  data() {
    return {
      email: '',
    };
  },
  methods: {
    rules() {
      if (this.email === 'test') {
        return 'O valor não pode ser igual test';
      }
      return true;
    },
  },
});
</script>

<style lang="scss"></style>
