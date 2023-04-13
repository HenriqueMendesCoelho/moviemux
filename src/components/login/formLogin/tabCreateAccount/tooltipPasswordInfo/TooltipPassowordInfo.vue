<template>
  <CustomTooltip class="bg-grey-mid2" v-model="show" style="border-radius: 15px" no-parent-event>
    <q-list dark style="border-radius: 15px">
      <q-item>
        <q-item-section
          ><p>- A senha <strong>deve</strong> conter:</p></q-item-section
        >
      </q-item>
      <q-separator dark />
      <q-item>
        <q-item-section><p>- Letras maiúsculas e minúsculas</p></q-item-section>
      </q-item>
      <q-separator dark />
      <q-item>
        <q-item-section>
          <p>- Números</p>
        </q-item-section>
      </q-item>
      <q-separator dark />
      <q-item>
        <q-item-section>
          <p>- Caracteres especiais</p>
        </q-item-section>
      </q-item>
    </q-list>
  </CustomTooltip>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

import CustomTooltip from '@/components/shared/customTooltip/CustomTooltip.vue';

const show = ref<boolean>(false);

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:model-value', show: boolean): void;
}>();

watch(
  () => props.modelValue,
  (val: boolean) => {
    show.value = val;
  }
);

watch(show, (val: boolean) => {
  emit('update:model-value', val);
});
</script>
