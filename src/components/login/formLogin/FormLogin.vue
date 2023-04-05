<template>
  <div class="row justify-center">
    <q-card class="form-login col-5" style="border-radius: 15px; min-width: 550px" v-auto-animate>
      <q-card-section class="row justify-center">
        <q-tab-panels v-model="tab" class="tabs col-12" animated style="min-height: 460px">
          <q-tab-panel name="login">
            <TabLogin @change-tab="tab = $event" @loading="loading = $event" :createAccount="createAccount" />
          </q-tab-panel>

          <q-tab-panel name="create"><TabCreateAccount @change-tab="tab = $event" @loading="loading = $event" /></q-tab-panel>

          <q-tab-panel name="forgot"
            ><TabForgotPassword @change-tab="tab = $event" @loading="loading = $event" :createAccount="createAccount" />
          </q-tab-panel>
        </q-tab-panels>
      </q-card-section>
      <q-inner-loading :showing="loading" label="Aguarde..." color="kb-primary" label-class="text-white" :dark="true" />
    </q-card>
  </div>
</template>

<script lang="ts" scoped>
import { defineComponent } from 'vue';
import { useQuasar } from 'quasar';

import TabLogin from './tabLogin/TabLogin.vue';
import TabCreateAccount from './tabCreateAccount/TabCreateAccount.vue';
import TabForgotPassword from './tabForgotPassword/TabForgotPassword.vue';

export default defineComponent({
  nome: 'FormForm',
  components: {
    TabLogin,
    TabCreateAccount,
    TabForgotPassword,
  },
  props: {
    modelValue: {
      type: String,
      default: 'login',
    },
    createAccount: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['update:modelValue'],
  setup() {
    const $q = useQuasar();

    return {
      showSuccess(msg: string) {
        $q.notify({
          type: 'positive',
          message: msg,
          position: 'top',
        });
      },
      showError(msg: string) {
        $q.notify({
          type: 'negative',
          message: msg,
          position: 'top',
        });
      },
    };
  },
  data() {
    return {
      tab: 'login',
      loading: false,
    };
  },
  watch: {
    modelValue() {
      this.tab = this.modelValue;
    },
    tab() {
      this.$emit('update:modelValue', this.tab);
    },
  },
});
</script>

<style lang="scss" scoped>
.form-login {
  background-color: var(--grey-mid);
  box-shadow: 0 10px 30px var(--shadow);

  .tabs {
    background-color: transparent;
  }
}
</style>
