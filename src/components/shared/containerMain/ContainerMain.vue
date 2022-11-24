<template>
  <div class="container-m"><slot></slot></div>
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
.container-m {
  display: flex;
  flex-direction: column;

  margin-left: v-bind(getMarginSideBar);
  padding: 2rem;
  margin-top: 2rem;

  $width: calc(v-bind(getMarginSideBar));

  max-width: 100%;
  min-width: calc(100vw - $width);

  min-height: calc(100vh - 2rem);

  border-top-left-radius: 10px;
  background: var(--grey-dark2);
  box-shadow: 0 10px 30px var(--shadow);

  transition: 0.2s ease-out;

  overflow: none;

  @media (max-width: 768px) {
    margin-left: calc(4rem + 32px);
  }
}
</style>
>
