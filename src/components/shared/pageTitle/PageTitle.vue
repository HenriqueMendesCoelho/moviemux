<template>
  <div class="row justify-center q-pt-lg q-px-lg page-title">
    <div class="text-h3 text-white q-mb-lg">{{ props.title }} <slot name="title"></slot></div>
    <div>
      <q-icon class="q-ml-md" :name="props.icon" color="white" size="xl" />
      <slot name="after-icon"></slot>
    </div>
  </div>
</template>
<script setup lang="ts">
interface Props {
  title: string;
  icon: string;
}

const props = defineProps<Props>();
</script>
<style lang="scss" scoped>
.page-title {
  background-color: var(--grey-mid);
  border-radius: 15px;
  border: 3px solid var(--grey-mid2);

  box-shadow: 0 5px 20px var(--shadow);
}
</style>
