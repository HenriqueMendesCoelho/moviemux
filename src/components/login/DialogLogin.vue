<template>
  <q-dialog v-model="visible" persistent>
    <FormLogin :createAccount="false" />
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import FormLogin from './FormLogin.vue';

export default defineComponent({
  name: 'DialogLogin',
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
  },
  components: {
    FormLogin,
  },
  data() {
    return {
      visible: false,
    };
  },
  emits: ['update:modelValue'],
  watch: {
    modelValue() {
      this.visible = this.modelValue;
    },
    visible() {
      this.$emit('update:modelValue', this.visible);
    },
  },
});
</script>
