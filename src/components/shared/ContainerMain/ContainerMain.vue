<template>
  <main><slot></slot></main>
</template>

<script>
import { defineComponent } from 'vue';
import { mapState } from 'pinia';
import { useStyleStore } from '@/stores/StyleStore';

defineComponent;

export default defineComponent({
  name: 'ContainerMain',
  computed: {
    ...mapState(useStyleStore, ['getMarginSideBar']),
  },
});
</script>

<style lang="scss" scoped>
main {
  display: flex;
  flex-direction: column;

  margin-left: v-bind(getMarginSideBar);
  margin-top: 1.5rem;

  min-height: calc(100vh - 1.5rem);
  max-width: 100%;

  border-top-left-radius: 10px;
  background: var(--grey-dark2);
  box-shadow: 0 10px 30px var(--shadow);

  transition: 0.2s ease-out;

  overflow: hidden;

  @media (max-width: 768px) {
    margin-left: calc(4rem + 32px);
  }
}
</style>
>
