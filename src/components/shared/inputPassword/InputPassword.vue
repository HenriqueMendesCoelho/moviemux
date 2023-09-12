<template>
  <q-input
    ref="inputPasswordRef"
    name="password"
    label="Senha"
    v-model="password"
    color="kb-primary"
    dark
    :type="visibility ? 'text' : 'password'"
    :rules="[...getRules()]"
  >
    <template v-slot:append>
      <q-icon name="visibility" v-if="!visibility" @click="visibility = !visibility" />
      <q-icon name="visibility_off" v-if="visibility" @click="visibility = !visibility" />
    </template>
    <slot />
  </q-input>
</template>
<script lang="ts" setup>
import { ref, watch, nextTick } from 'vue';
import type { InputValidateRefType } from '../inputText/types/InputValidateRefType';
import type { ValidationRule } from 'quasar';

const password = ref<string>('');
const regexPassword = ref<RegExp>(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@#$!%*?&])[A-Za-z\d@#$!%*?&]{8,70}$/);
const inputPasswordRef = ref<InputValidateRefType>();
const visibility = ref(false);

interface Props {
  customRules?: ValidationRule;
  required?: boolean;
  validPassword?: boolean;
  errorTextRequired?: boolean;
  errorTextValidPassord?: boolean;
  modelValue: string;
}
const props = withDefaults(defineProps<Props>(), {
  customRules: () => true,
  required: false,
  validPassword: false,
  errorTextRequired: true,
  errorTextValidPassord: true,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

defineExpose({
  hasErrors,
  resetValidation,
});

watch(
  () => props.modelValue,
  (val) => {
    password.value = val;
  }
);

watch(
  () => password.value,
  (val) => {
    emit('update:modelValue', val);
  }
);

function getRules(): ValidationRule[] {
  return [requireRules(), passwordRule(), props.customRules];
}
function requireRules(): ValidationRule {
  if (!props.required) {
    return () => true;
  }

  if (!props.errorTextRequired) {
    return () => !!password.value;
  }

  return () => !!password.value || 'Obrigatório';
}
function passwordRule(): ValidationRule {
  if (!props.validPassword) {
    return () => true;
  }

  if (!props.errorTextValidPassord) {
    return (val) => regexPassword.value.test(val);
  }

  return (val) => regexPassword.value.test(val) || 'A senha deve conter letras maiúsculas e minúsculas, números e caracteres especiais';
}
function hasErrors() {
  if (inputPasswordRef.value) {
    inputPasswordRef.value.validate();
    return inputPasswordRef.value.hasError;
  }
  return false;
}
function resetValidation() {
  nextTick(() => {
    inputPasswordRef.value?.resetValidation();
  });
}
</script>
