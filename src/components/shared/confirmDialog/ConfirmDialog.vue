<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'ConfirmDialog',
  emits: ['Ok', 'Cancel'],
  methods: {
    dialog(title = 'Confirme', message: string, persisstent = true) {
      this.$q
        .dialog({
          dark: true,
          title: title,
          message: message,
          cancel: true,
          persistent: persisstent,
          color: 'cyan-14',
          class: 'dialog-container',
        })
        .onOk(() => {
          this.$emit('Ok');
        })
        .onCancel(() => {
          this.$emit('Cancel');
        });
    },
  },
});
</script>
