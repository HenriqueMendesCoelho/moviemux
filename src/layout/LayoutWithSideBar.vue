<template>
  <SideBar />
  <router-view />
  <DialogLogin v-model="showDialogLogin" :actionLogin="login" />
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapState } from 'pinia';

import { useLoginStore } from '@/stores/LoginStore';
import SideBar from '@/components/shared/sidebar/SideBar.vue';
import DialogLogin from '@/components/login/DialogLogin.vue';

export default defineComponent({
  name: 'LayoutWithSideBar',
  components: {
    SideBar,
    DialogLogin,
  },
  computed: {
    ...mapState(useLoginStore, ['user', 'showDialogLogin']),
  },
  methods: {
    login() {
      //Chamar api e salvar token
      this.user.isLoged = false;
    },
  },
});
</script>
