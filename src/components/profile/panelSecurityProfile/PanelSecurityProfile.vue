<template>
  <div class="row q-pt-md justify-center">
    <h5>Alteração de senha</h5>
    <SeparatorDivLineSolid />
    <div class="q-mt-md" :class="isMobile ? 'col-12' : 'col-6'">
      <InputText :label="'Senha atual'" v-model="currentPass" :type="'password'" />
    </div>
    <div class="col-12" />
    <div class="q-mt-md" :class="isMobile ? 'col-12' : 'col-6'">
      <InputText :label="'Nova Senha'" v-model="newPass" :type="'password'" />
    </div>
    <div class="col-12" />
    <div class="q-mt-md q-mb-xl" :class="isMobile ? 'col-12' : 'col-6'">
      <InputText :label="'Confirme Nova Senha'" v-model="confirmNewPass" :type="'password'" />
    </div>
    <div class="col-12" />
    <div :class="isMobile ? 'col-4' : 'col-2'">
      <q-btn style="width: 100%" color="positive" text-color="white" label="Salvar" />
    </div>
    <div :class="isMobile ? 'col-4 q-ml-md' : 'col-2 q-ml-md q-mb-sm'">
      <q-btn style="width: 100%" color="red" text-color="white" label="Cancelar" />
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue';

import InputText from '@/components/shared/inputText/InputText.vue';
import SeparatorDivLineSolid from '@/components/shared/separator/SeparatorDivLineSolid.vue';

export default defineComponent({
  name: 'PanelSecurityProfile',
  components: {
    InputText,
    SeparatorDivLineSolid,
  },
  data() {
    return {
      currentPass: '',
      newPass: '',
      confirmNewPass: '',
    };
  },
});
</script>
