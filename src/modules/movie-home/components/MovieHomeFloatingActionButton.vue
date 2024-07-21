<template>
  <BaseFloatingActionBtn class="desktop-only">
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
  </BaseFloatingActionBtn>
</template>

<script lang="ts" setup>
import BaseFloatingActionBtn from 'src/core/components/BaseFloatingActionBtn.vue';
</script>
