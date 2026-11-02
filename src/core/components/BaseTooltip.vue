<template>
  <span class="mm-tooltip" role="tooltip"><slot /></span>
</template>
<style scoped>
.mm-tooltip {
  display: none;
  position: absolute;
  z-index: 60;
  background: var(--grey-dark2);
  border: 1px solid var(--grey-mid);
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 0.75rem;
  white-space: normal;
  max-width: 260px;
  bottom: 100%;
  left: 0;
}
:hover > .mm-tooltip,
:focus-within > .mm-tooltip {
  display: block;
}
</style>
