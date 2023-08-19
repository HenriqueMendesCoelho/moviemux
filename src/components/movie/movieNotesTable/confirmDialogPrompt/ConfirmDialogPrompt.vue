<template>
  <div></div>
</template>
<script setup lang="ts">
import { useQuasar } from 'quasar';

const $q = useQuasar();

defineExpose({ dialog });

const emit = defineEmits<{
  (e: 'ok', value: string | undefined): void;
  (e: 'cancel', value: void): void;
}>();

function dialog() {
  window.scrollTo(0, 0);
  $q.dialog({
    dark: true,
    message: 'Insira uma nota de 0 a 10',
    persistent: false,
    color: 'kb-primary',
    class: 'bg-grey-mid',
    prompt: {
      model: '',
      type: 'number',
      isValid: (val) => parseInt(val) >= 0 && parseInt(val) <= 10,
      min: '0',
      max: '10',
      step: '1',
    },
    ok: {
      label: 'Cadastrar',
      flat: true,
    },
    cancel: {
      label: 'Cancelar',
      flat: true,
    },
    seamless: false,
    focus: 'ok',
  })
    .onOk((data: string | undefined) => {
      emit('ok', data);
    })
    .onCancel(() => {
      emit('cancel');
    });
}
</script>
