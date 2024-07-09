<template>
  <q-dialog v-model="visible" persistent>
    <LoginForm :createAccount="false" />
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

import LoginForm from './LoginForm.vue';

interface Props {
  modelValue?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const visible = ref(false);

watch(
  () => props.modelValue,
  (val: boolean) => {
    visible.value = val;
  }
);

watch(
  () => visible.value,
  (val: boolean) => {
    emit('update:modelValue', val);
  }
);
</script>
