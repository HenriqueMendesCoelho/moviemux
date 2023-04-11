<template>
  <div class="absolute-bottom-right" style="position: fixed; bottom: 5vh; right: 5vh">
    <q-fab color="kb-primary" icon="keyboard_arrow_up" direction="up">
      <q-fab-action color="grey-mid2" @click="pushToMovie" icon="add"
        ><CustomTooltip anchor="bottom middle" :offset="[0, 10]" :delay="800">ADICIONAR FILME</CustomTooltip></q-fab-action
      >
      <q-fab-action color="grey-mid2" @click="scrollToTop" icon="keyboard_arrow_up"
        ><CustomTooltip anchor="bottom middle" :offset="[0, 10]" :delay="800">IR PARA O TOPO</CustomTooltip></q-fab-action
      >
    </q-fab>
  </div>
</template>

<script lang="ts" setup>
import { useRouter } from 'vue-router';

import CustomTooltip from '@/components/shared/customTooltip/CustomTooltip.vue';

const router = useRouter();

function pushToMovie(): void {
  router.push({ name: 'add' });
}
function scrollToTop(): void {
  window.scrollTo(0, 0);
}
</script>
