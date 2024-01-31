<script lang="ts" setup>
import { useQuasar } from 'quasar';

const emit = defineEmits<{
  (e: 'ok', value: void | string): void;
  (e: 'cancel', value: void | string): void;
}>();

const $q = useQuasar();

defineExpose({ show });

function show({
  message,
  focus = 'ok',
  title = 'Confirme',
  ok = 'Ok',
  cancel = 'Cancelar',
  persistent = true,
  event,
}: {
  message?: string;
  focus?: 'ok' | 'cancel' | 'none';
  title?: string;
  ok?: string;
  cancel?: string;
  persistent?: boolean;
  event?: string;
}) {
  $q.dialog({
    dark: true,
    title: title,
    message: message,
    persistent: persistent,
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
      emit('ok', event);
    })
    .onCancel(() => {
      emit('cancel', event);
    });
}
</script>
