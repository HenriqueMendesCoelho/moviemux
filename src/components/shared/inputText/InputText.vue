<template>
  <q-input
    ref="inputRef"
    standout="text-info"
    color="grey-1"
    bg-color="grey-1"
    outlined
    v-model="text"
    :label="label"
    dark
    :rules="[getRules]"
    reactive-rules
    :readonly="readOnly"
    hide-bottom-space
    :dense="dense"
    :type="type"
    :mask="mask"
    clearable
  />
</template>

<script lang="ts">
import type { QInputProps } from 'quasar';
import { defineComponent, PropType, ref } from 'vue';

//style="background-color: var(--grey-mid2)"
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
      default: true,
    },
    customRules: {
      type: Function,
      required: false,
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
    const inputRef = ref(null);
    return {
      inputRef,
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
      if (!this.required) return true;
      return this.text ? true : '*Obrigatório';
    },
    getCustomRules() {
      if (this.customRules) {
        return this.customRules();
      }
      return true;
    },
    getRules(): boolean | string {
      if (typeof this.defaultRules() == 'string') {
        return this.defaultRules();
      }
      if (typeof this.getCustomRules() == 'string') {
        return this.getCustomRules();
      }
      return true;
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
