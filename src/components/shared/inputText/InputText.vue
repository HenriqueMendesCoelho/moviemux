<template>
  <q-input
    ref="inputTextRef"
    standout="text-info"
    color="grey-mid2"
    bg-color="grey-mid2"
    outlined
    v-model="text"
    :label="label"
    dark
    :rules="[defaultRules, getCustomRules]"
    :readonly="readOnly"
    hide-bottom-space
    :dense="dense"
    :type="type"
    :mask="mask"
    clearable
    :lazy-rules="true"
  />
</template>

<script lang="ts">
import type { QInputProps } from 'quasar';
import { defineComponent, PropType, ref } from 'vue';

import { InputValidateRefType } from './types/InputValidateRefType';

export default defineComponent({
  name: 'InputText',
  props: {
    label: {
      type: String,
      required: true,
    },
    modelValue: {
      type: String,
      required: false,
    },
    required: {
      type: Boolean,
      default: false,
    },
    customRules: {
      type: [Boolean, String],
      default: true,
    },
    customRulesText: {
      type: String,
    },
    readOnly: {
      type: Boolean,
      default: false,
    },
    dense: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String as PropType<QInputProps['type']>,
      default: 'text',
    },
    mask: {
      type: String as PropType<QInputProps['mask']>,
      default: undefined,
    },
  },
  setup() {
    const inputTextRef = ref<InputValidateRefType>();
    return {
      inputTextRef,
    };
  },
  data() {
    return {
      text: '',
    };
  },
  emits: ['update:modelValue'],
  methods: {
    defaultRules(): boolean | string {
      if (!this.required) {
        return true;
      }
      return this.text ? true : '*Obrigatório';
    },
    getCustomRules(): boolean | string {
      if (this.customRulesText) {
        return this.customRules ? true : this.customRulesText;
      }

      return this.customRules;
    },
    getRules(): Array<boolean | string> {
      return [this.defaultRules(), this.getCustomRules()];
    },
    hasErrors(): boolean {
      let hasErrors = false;
      if (this.inputTextRef) {
        this.inputTextRef.validate();
        hasErrors = this.inputTextRef?.hasError;
      }
      return hasErrors;
    },
    resetValidation(): void {
      if (this.inputTextRef) {
        this.inputTextRef.resetValidation();
      }
    },
  },
  watch: {
    text() {
      this.$emit('update:modelValue', this.text);
    },
    modelValue() {
      this.text = this.modelValue || '';
    },
  },
});
</script>
