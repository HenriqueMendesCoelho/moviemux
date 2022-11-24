<template>
  <main>
    <div class="row items-center" style="height: 100%">
      <div class="col-6">
        <div class="row justify-center">
          <img src="@/assets/logo-kronus.png" class="left-img-login" alt="logo" draggable="false" />
        </div>
      </div>
      <div class="col-6">
        <q-dialog v-model="login" allow-focus-outside>
          <img src="@/assets/logo-kronus.png" class="left-img-login" alt="logo" draggable="false" />
        </q-dialog>
      </div>
    </div>
  </main>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'LoginPage',
  data() {
    return {
      login: true,
      button_text: 'Login',
      input_pass: '',
      input_email: '',
      input_code: '',
    };
  },
  methods: {
    routeToLogin() {
      this.$router.push({ name: 'home' });
    },
  },
});
</script>

<style lang="scss" scoped>
main {
  height: 100%;

  .left-img-login {
    border-radius: 50%;

    &:hover {
      box-shadow: 0px 0px 30px -12px var(--primary);
      transition: 0.2s ease-in-out;
    }
  }
}
</style>
