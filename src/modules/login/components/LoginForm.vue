<template>
  <div class="row justify-center">
    <q-card class="col form-login">
      <q-card-section class="row justify-center">
        <q-tab-panels v-model="tab" class="tabs" animated>
          <q-tab-panel name="login">
            <LoginTab
              @change-tab="tab = $event"
              @loading="loading = $event"
              :createAccount="props.createAccount"
            />
          </q-tab-panel>

          <q-tab-panel name="create"
            ><LoginCreateAccountTab @change-tab="tab = $event" @loading="loading = $event"
          /></q-tab-panel>

          <q-tab-panel name="forgot"
            ><LoginForgotPasswordTab
              @change-tab="tab = $event"
              @loading="loading = $event"
              :createAccount="props.createAccount"
            />
          </q-tab-panel>
        </q-tab-panels>
      </q-card-section>
      <q-inner-loading
        :showing="loading"
        label="Aguarde..."
        color="kb-primary"
        label-class="text-white"
        dark
      />
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

import LoginTab from './LoginTab.vue';
import LoginForgotPasswordTab from './LoginForgotPasswordTab.vue';
import LoginCreateAccountTab from './LoginCreateAccountTab.vue';

interface Props {
  createAccount?: boolean;
}

const tab = defineModel<string>({
  default: 'login',
});
const props = withDefaults(defineProps<Props>(), {
  createAccount: true,
});
const loading = ref(false);
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
