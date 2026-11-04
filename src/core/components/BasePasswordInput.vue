<template>
  <div class="mm-field mm-password-field" :class="$attrs.class" :style="$attrs.style">
    <label :for="id || fieldId">{{ label || t('components.password') }}</label>
    <div class="mm-password-control" @focusout="onFocusOut">
      <input
        v-bind="inputAttrs()"
        :id="id || fieldId"
        ref="inputElement"
        class="mm-password-input"
        :type="visible ? 'text' : 'password'"
        :value="modelValue"
        :required="required"
        :disabled="disabled"
        :aria-invalid="invalid"
        :aria-describedby="describedBy()"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        @blur="validate"
      />
      <button
        type="button"
        class="mm-password-toggle"
        :aria-label="visible ? t('components.hidePassword') : t('components.showPassword')"
        :aria-pressed="visible"
        :aria-controls="id || fieldId"
        :disabled="disabled"
        @mousedown.prevent
        @click="visible = !visible"
      >
        <BaseIcon :name="visible ? 'eye' : 'eye-off'" />
      </button>
    </div>
    <small :id="errorId" v-if="error" class="mm-error" role="alert">{{
      error.startsWith('components.') ? t(error) : error
    }}</small>
    <slot />
  </div>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
import { onBeforeUnmount, onDeactivated, onMounted, ref, useAttrs, useId, watch } from 'vue';
import BaseIcon from './BaseIcon.vue';
defineOptions({ inheritAttrs: false });
type Rule = (value: string) => boolean | string | Promise<boolean | string>;
const props = withDefaults(
  defineProps<{
    modelValue: string;
    id?: string;
    label?: string;
    customRules?: Rule;
    required?: boolean;
    disabled?: boolean;
    validPassword?: boolean;
    errorTextRequired?: boolean;
    errorTextValidPassord?: boolean;
  }>(),
  {
    label: '',
    required: false,
    disabled: false,
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
  fieldId = useId(),
  errorId = useId();
const inputElement = ref<HTMLInputElement>();
let form: HTMLFormElement | null = null;
function hidePassword() {
  visible.value = false;
}
function onFocusOut(event: FocusEvent) {
  if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) {
    hidePassword();
  }
}
watch(
  () => props.modelValue,
  (value) => {
    if (!value) hidePassword();
  },
);
watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) hidePassword();
  },
);
onMounted(() => {
  form = inputElement.value?.form ?? null;
  form?.addEventListener('reset', hidePassword);
});
onBeforeUnmount(() => form?.removeEventListener('reset', hidePassword));
onDeactivated(hidePassword);
function inputAttrs() {
  const { class: _class, style: _style, ...rest } = attrs;
  void _class;
  void _style;
  return rest;
}
function describedBy() {
  return (
    [attrs['aria-describedby'], error.value ? errorId : undefined].filter(Boolean).join(' ') ||
    undefined
  );
}
async function validate() {
  let result: boolean | string | undefined;
  if (props.required && !props.modelValue)
    result = props.errorTextRequired ? 'components.required' : false;
  else if (
    props.validPassword &&
    !/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@#$!%*?&])[A-Za-z\d@#$!%*?&]{8,70}$/.test(
      props.modelValue,
    )
  )
    result = props.errorTextValidPassord ? 'components.passwordRequirements' : false;
  else result = await props.customRules?.(props.modelValue);
  invalid.value = result === false || typeof result === 'string';
  error.value = typeof result === 'string' ? result : '';
  return !invalid.value;
}
async function hasErrors() {
  return !(await validate());
}
async function resetValidation() {
  hidePassword();
  invalid.value = false;
  error.value = '';
}
defineExpose({ hasErrors, resetValidation, validate });
</script>
<style scoped>
.mm-password-field > label {
  font: inherit;
  color: inherit;
}
.mm-password-control {
  position: relative;
  min-width: 0;
}
.mm-password-control .mm-password-input {
  min-height: 48px;
  padding-inline-end: 3.5rem;
}
.mm-password-control .mm-password-input[aria-invalid='true'] {
  border-color: var(--mm-danger-text);
}
.mm-password-toggle {
  position: absolute;
  inset-inline-end: 2px;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--mm-muted);
  cursor: pointer;
}
.mm-password-toggle:hover:not(:disabled) {
  background: var(--mm-raised);
  color: var(--mm-text);
}
.mm-password-toggle:focus-visible {
  color: var(--mm-text);
  outline: 2px solid var(--mm-focus-ring, var(--mm-link));
  outline-offset: -3px;
}
.mm-password-toggle:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
