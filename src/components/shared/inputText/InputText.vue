<template>
  <q-input
    ref="inputRef"
    standout="text-info"
    bg-color="grey-1"
    outlined
    v-model="text"
    :label="label"
    dark
    :rules="[getRules]"
    reactive-rules
  />
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';

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
      required: true,
    },
    required: {
      type: Boolean,
      default: true,
    },
    customRules: {
      type: Function,
      required: false,
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
      let result = true;
      if (typeof this.defaultRules() == 'string') {
        return this.defaultRules();
      }
      if (typeof this.getCustomRules() == 'string') {
        return this.getCustomRules();
      }
      return result;
    },
  },
  watch: {
    text() {
      this.$emit('update:modelValue', this.text);
    },
    modelValue() {
      this.text = this.modelValue;
    },
  },
});
</script>

<style lang="scss" scoped></style>
