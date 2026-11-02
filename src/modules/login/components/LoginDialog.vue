<template>
  <dialog
    ref="dialog"
    class="mm-dialog"
    aria-label="Entre novamente"
    @cancel.prevent
    @close="emit('update:modelValue', false)"
  >
    <p class="mm-muted">Sua sessão expirou. Entre para continuar.</p>
    <LoginForm :create-account="false" @loading="busy = $event" />
    <button class="mm-link" type="button" :disabled="busy" @click="leaveSession">
      Sair e voltar ao início
    </button>
  </dialog>
</template>
<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from 'src/core/stores/UserStore';
import LoginForm from './LoginForm.vue';
const props = withDefaults(defineProps<{ modelValue?: boolean }>(), { modelValue: false });
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();
const dialog = ref<HTMLDialogElement>();
const busy = ref(false);
const router = useRouter();
const store = useUserStore();
async function leaveSession() {
  if (busy.value) return;
  store.logout();
  emit('update:modelValue', false);
  await router.replace('/');
}
function sync() {
  if (props.modelValue && !dialog.value?.open) dialog.value?.showModal();
  else if (!props.modelValue && dialog.value?.open) dialog.value.close();
}
watch(() => props.modelValue, sync);
onMounted(sync);
</script>
