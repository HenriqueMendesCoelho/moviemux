<template>
  <div class="row justify-center">
    <q-card class="col form-login">
      <q-card-section class="row justify-center">
        <q-tab-panels v-model="tab" class="tabs" animated>
          <q-tab-panel name="login">
            <TabLogin @change-tab="tab = $event" @loading="loading = $event" :createAccount="createAccount" />
          </q-tab-panel>

          <q-tab-panel name="create"><TabCreateAccount @change-tab="tab = $event" @loading="loading = $event" /></q-tab-panel>

          <q-tab-panel name="forgot"
            ><TabForgotPassword @change-tab="tab = $event" @loading="loading = $event" :createAccount="createAccount" />
          </q-tab-panel>
        </q-tab-panels>
      </q-card-section>
      <q-inner-loading :showing="loading" label="Aguarde..." color="kb-primary" label-class="text-white" dark />
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

import TabLogin from './tabLogin/TabLogin.vue';
import TabCreateAccount from './tabCreateAccount/TabCreateAccount.vue';
import TabForgotPassword from './tabForgotPassword/TabForgotPassword.vue';

interface Props {
  modelValue: string;
  createAccount?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: 'login',
  createAccount: true,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const tab = ref('login');
const loading = ref(false);

watch(
  () => props.modelValue,
  (val: string) => {
    tab.value = val;
  }
);

watch(
  () => tab.value,
  (val: string) => {
    emit('update:modelValue', val);
  }
);
</script>

<style lang="scss" scoped>
.form-login {
  background-color: var(--grey-mid);
  box-shadow: 0 10px 30px var(--shadow);
  border-radius: 15px;

  .tabs {
    background-color: transparent;
  }
}
</style>
