<template>
  <dialog
    ref="dialog"
    class="mm-dialog"
    :aria-label="t('account.signInAgain')"
    @cancel.prevent
    @close="emit('update:modelValue', false)"
  >
    <p class="mm-muted">{{ t('account.sessionExpired') }}</p>
    <LoginForm :create-account="false" @loading="busy = $event" />
    <p v-if="exitError" role="alert" class="mm-error">{{ exitError }}</p>
    <button class="mm-link" type="button" :disabled="busy" @click="leaveSession">
      {{ t('account.leaveSession') }}
    </button>
  </dialog>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
import { computed, ref, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from 'src/core/stores/UserStore';
import LoginForm from './LoginForm.vue';
const props = withDefaults(defineProps<{ modelValue?: boolean }>(), { modelValue: false });
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();
const dialog = ref<HTMLDialogElement>();
const busy = ref(false);
const exitErrorMessage = ref<() => string>(() => '');
const exitError = computed(() => exitErrorMessage.value());
const router = useRouter();
const store = useUserStore();
async function leaveSession() {
  if (busy.value) return;
  busy.value = true;
  exitErrorMessage.value = () => '';
  try {
    await store.logout();
    emit('update:modelValue', false);
    await router.replace('/');
  } catch {
    exitErrorMessage.value = () => t('account.logoutFailed');
  } finally {
    busy.value = false;
  }
}
function sync() {
  if (props.modelValue && !dialog.value?.open) dialog.value?.showModal();
  else if (!props.modelValue && dialog.value?.open) dialog.value.close();
}
watch(() => props.modelValue, sync);
onMounted(sync);
</script>
