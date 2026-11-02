<template>
  <label class="mm-field" :class="$attrs.class" :style="$attrs.style"
    ><span>{{ label }}</span
    ><span class="mm-input-wrap"
      ><input
        v-bind="inputAttrs()"
        :type="visible ? 'text' : 'password'"
        :value="modelValue"
        :required="required"
        :aria-invalid="invalid"
        :aria-describedby="error ? errorId : undefined"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        @blur="validate"
      /><button
        type="button"
        class="mm-button mm-button-ghost"
        :aria-label="visible ? 'Ocultar senha' : 'Mostrar senha'"
        :aria-pressed="visible"
        @click="visible = !visible"
      >
        {{ visible ? 'Ocultar' : 'Mostrar' }}
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
    modelValue: string;
    label?: string;
    customRules?: Rule;
    required?: boolean;
    validPassword?: boolean;
    errorTextRequired?: boolean;
    errorTextValidPassord?: boolean;
  }>(),
  {
    label: 'Senha',
    required: false,
    validPassword: false,
    errorTextRequired: true,
    errorTextValidPassord: true,
  },
);
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const visible = ref(false),
  error = ref(''),
  invalid = ref(false);
const attrs = useAttrs(),
  errorId = useId();
function inputAttrs() {
  const { class: _class, style: _style, ...rest } = attrs;
  void _class;
  void _style;
  return rest;
}
async function validate() {
  let result: boolean | string | undefined;
  if (props.required && !props.modelValue) result = props.errorTextRequired ? 'Obrigatório' : false;
  else if (
    props.validPassword &&
    !/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@#$!%*?&])[A-Za-z\d@#$!%*?&]{8,70}$/.test(
      props.modelValue,
    )
  )
    result = props.errorTextValidPassord
      ? 'Use 8–70 caracteres, letras maiúsculas e minúsculas, números e símbolos (@#$!%*?&).'
      : false;
  else result = await props.customRules?.(props.modelValue);
  invalid.value = result === false || typeof result === 'string';
  error.value = typeof result === 'string' ? result : '';
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
