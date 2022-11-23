<template>
  <div class="PanelSecurity row q-pt-md justify-center">
    <h5>Alteração de senha</h5>
    <SeparatorDivLineSolid />
    <div class="q-mt-md" :class="isMobile ? 'col-12' : 'col-8'">
      <InputText :label="'Senha atual'" v-model="currentPass" :type="'password'" />
    </div>
    <div class="q-mt-md" :class="isMobile ? 'col-12' : 'col-8'">
      <InputText :label="'Nova Senha'" v-model="newPass" :type="'password'" />
    </div>
    <div class="q-mt-md q-mb-xl" :class="isMobile ? 'col-12' : 'col-8'">
      <InputText :label="'Confirme Nova Senha'" v-model="confirmNewPass" :type="'password'" />
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

<style lang="scss" scoped>
.panel-profile {
  background: var(--grey-mid);
  height: auto;
  border-radius: 15px;

  box-shadow: 0 5px 10px var(--shadow);
}
</style>
