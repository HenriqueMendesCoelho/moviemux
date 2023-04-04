<template>
  <div></div>
</template>
<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'ConfirmDialogPrompt',
  emits: ['ok', 'cancel'],
  methods: {
    dialog() {
      window.scrollTo(0, 0);
      this.$q
        .dialog({
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
        .onOk((data) => {
          this.$emit('ok', data);
        })
        .onCancel(() => {
          this.$emit('cancel');
        });
    },
  },
});
</script>
