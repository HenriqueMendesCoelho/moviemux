<template>
  <label class="mm-field" :class="$attrs.class" :style="$attrs.style"
    ><span v-if="label">{{ label }}</span
    ><span class="mm-input-wrap">
      <textarea
        v-if="type === 'textarea'"
        v-bind="inputAttrs()"
        :value="modelValue ?? ''"
        :required="required"
        :aria-invalid="invalid"
        :aria-describedby="error ? errorId : undefined"
        @input="input"
        @blur="validate"
      /><input
        v-else
        v-bind="inputAttrs()"
        :type="type"
        :value="modelValue ?? ''"
        :required="required"
        :aria-invalid="invalid"
        :aria-describedby="error ? errorId : undefined"
        @input="input"
        @blur="validate"
      /><button
        v-if="canClear()"
        type="button"
        class="mm-button mm-button-ghost"
        :aria-label="`Limpar ${label || 'campo'}`"
        @click="clear"
      >
        ✕</button
      ><button
        v-if="icon"
        type="button"
        class="mm-button mm-button-ghost"
        :title="iconTooltip"
        :aria-label="iconTooltip || 'Abrir link'"
        @click="emit('iconClick')"
      >
        ↗
      </button></span
    ><small :id="errorId" v-if="error" class="mm-error" role="alert">{{ error }}</small
    ><slot
  /></label>
</template>
<script setup lang="ts">
import { ref, useAttrs, useId } from 'vue';
defineOptions({ inheritAttrs: false });
type Rule = (value: string) => boolean | string | Promise<boolean | string>;
const props = withDefaults(
  defineProps<{
    label?: string;
    modelValue?: string;
    customRules?: Rule;
    icon?: string;
    iconTooltip?: string;
    required?: boolean;
    cursorTooltip?: string;
    iconCursor?: string;
    type?: string;
    clearable?: boolean;
  }>(),
  { required: false, type: 'text', clearable: true },
);
const emit = defineEmits<{ 'update:modelValue': [value: string]; iconClick: [] }>();
const error = ref('');
const invalid = ref(false);
const attrs = useAttrs();
const errorId = useId();
function inputAttrs() {
  const { class: _class, style: _style, ...rest } = attrs;
  void _class;
  void _style;
  return rest;
}
function canClear() {
  const readOnly = attrs.readonly === '' || Boolean(attrs.readonly);
  const disabled = attrs.disabled === '' || Boolean(attrs.disabled);
  return props.clearable && Boolean(props.modelValue) && !readOnly && !disabled;
}
function clear() {
  emit('update:modelValue', '');
  error.value = '';
  invalid.value = false;
}
function input(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).value);
}
async function validate() {
  const value = props.modelValue || '';
  const result = props.required && !value.trim() ? 'Obrigatório' : await props.customRules?.(value);
  invalid.value = result === false || typeof result === 'string';
  error.value = result === false ? 'Valor inválido' : typeof result === 'string' ? result : '';
  return !invalid.value;
}
async function hasErrors() {
  return !(await validate());
}
async function resetValidation() {
  invalid.value = false;
  error.value = '';
}
defineExpose({ hasErrors, resetValidation, validate });
</script>
