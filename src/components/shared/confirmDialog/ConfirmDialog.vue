<template>
  <div></div>
</template>
<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'ConfirmDialog',
  emits: ['ok', 'cancel'],
  methods: {
    dialog(
      message: string,
      focus: 'ok' | 'cancel' | 'none' = 'ok',
      title = 'Confirme',
      ok = 'Ok',
      cancel = 'Cancelar',
      persisstent = true
    ) {
      window.scrollTo(0, 0);
      this.$q
        .dialog({
          dark: true,
          title: title,
          message: message,
          persistent: persisstent,
          color: 'cyan-14',
          class: 'dialog-container',
          ok: {
            label: ok,
            flat: true,
          },
          cancel: {
            label: cancel,
            flat: true,
          },
          seamless: false,
          focus,
        })
        .onOk(() => {
          this.$emit('ok');
        })
        .onCancel(() => {
          this.$emit('cancel');
        });
    },
  },
});
</script>
