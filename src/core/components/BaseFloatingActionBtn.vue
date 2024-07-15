<template>
  <div class="absolute-bottom-right" style="position: fixed; bottom: 5vh; right: 5vh">
    <q-fab color="kb-primary" icon="keyboard_arrow_up" direction="up">
      <slot name="before-top"></slot>
      <q-fab-action
        color="grey-mid2"
        @click="scrollToTop"
        icon="keyboard_arrow_up"
        :external-label="true"
        label="IR PARA O TOPO"
        label-class="bg-grey-mid2"
        label-position="left"
      />
      <slot name="after-top"></slot>
    </q-fab>
  </div>
</template>

<script lang="ts" setup>
import { useStyleStore } from 'src/core/stores/StyleStore';

const styleStore = useStyleStore();
const scrollToTop = () => styleStore.scrollToContainer(0, 0, 'smooth');
</script>
