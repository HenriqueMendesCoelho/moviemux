<template>
  <div class="container-m"><slot></slot></div>
</template>

<script>
import { defineComponent } from 'vue';
import { mapState } from 'pinia';
import { useStyleStore } from '@/stores/StyleStore';

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

  padding: 2rem;
  margin-top: 2rem;

  max-width: 100%;

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
