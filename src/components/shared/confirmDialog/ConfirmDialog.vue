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
      this.$q
        .dialog({
          dark: true,
          title: title,
          message: message,
          persistent: persisstent,
          color: 'kb-primary',
          class: 'bg-grey-mid',
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
