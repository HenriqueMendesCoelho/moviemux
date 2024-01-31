<template>
  <FloatingActionBtnTop class="desktop-only">
    <template v-slot:after-top>
      <q-fab-action
        color="grey-mid2"
        :to="{ name: 'add' }"
        icon="add"
        :external-label="true"
        label="ADICIONAR FILME"
        label-class="bg-grey-mid2"
        label-position="left"
    /></template>
  </FloatingActionBtnTop>
</template>

<script lang="ts" setup>
import FloatingActionBtnTop from 'src/components/shared/floatingActionBtnTop/FloatingActionBtnTop.vue';
</script>
