<template>
  <q-input
    ref="inputTextRef"
    standout="text-kb-primary"
    color="kb-primary"
    bg-color="grey-mid2"
    outlined
    v-model="text"
    :label="label"
    dark
    :rules="[...getRules()]"
    hide-bottom-space
    clearable
    :lazy-rules="true"
    ><template v-slot:append v-if="icon">
      <q-icon
        :name="icon"
        @click="emit('iconClick')"
        :style="`cursor: ${iconCursor ? iconCursor : 'auto'}`"
        ><BaseTooltip v-if="iconTooltip" :delay="300" :hide-delay="300">{{
          iconTooltip
        }}</BaseTooltip></q-icon
      >
    </template></q-input
  >
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue';
import type { QInput, ValidationRule } from 'quasar';

import BaseTooltip from 'src/core/components/BaseTooltip.vue';

defineExpose({ hasErrors, resetValidation });

interface Props {
  label?: string;
  modelValue?: string;
  customRules?: ValidationRule;
  icon?: string;
  iconTooltip?: string;
  required?: boolean;
  cursorTooltip?: string;
  iconCursor?: string;
}

const props = withDefaults(defineProps<Props>(), {
  customRules: () => true,
  required: false,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'iconClick', value: void): void;
}>();

const inputTextRef = ref<InstanceType<typeof QInput>>();
const text = ref('');

onMounted(() => {
  text.value = props.modelValue || '';
});

watch(
  () => props.modelValue,
  (val) => {
    text.value = val || '';
  },
);

watch(
  () => text.value,
  (val) => {
    emit('update:modelValue', val);
  },
);

function defaultRules() {
  if (!props.required) {
    return () => true;
  }
  return () => (text.value ? true : '*Obrigatório');
}
function getRules(): ValidationRule[] {
  return [defaultRules(), props.customRules];
}
async function hasErrors(): Promise<boolean> {
  let hasErrors = false;
  if (inputTextRef.value) {
    await inputTextRef.value.validate();
    hasErrors = inputTextRef.value?.hasError;
  }
  return hasErrors;
}
async function resetValidation(): Promise<void> {
  await nextTick();

  inputTextRef.value?.resetValidation();
}
</script>
