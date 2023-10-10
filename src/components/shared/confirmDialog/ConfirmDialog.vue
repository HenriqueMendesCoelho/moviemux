<script lang="ts" setup>
import { useQuasar } from 'quasar';

const emit = defineEmits<{
  (e: 'ok', value: void): void;
  (e: 'cancel', value: void): void;
}>();

const $q = useQuasar();

defineExpose({ dialog });

function dialog(
  message: string,
  focus: 'ok' | 'cancel' | 'none' = 'ok',
  title = 'Confirme',
  ok = 'Ok',
  cancel = 'Cancelar',
  persisstent = true
) {
  $q.dialog({
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
      emit('ok');
    })
    .onCancel(() => {
      emit('cancel');
    });
}
</script>
