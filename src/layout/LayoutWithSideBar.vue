<template>
  <SideBar />
  <router-view />
  <DialogLogin v-model="isLoged" :actionLogin="login" />
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
    ...mapState(useLoginStore, ['isLoged']),
  },
  mounted() {
    setTimeout(() => {
      this.isLoged = true;
      return;
    }, 8000);
  },
  methods: {
    login() {
      //Chamar api e salvar token
      this.isLoged = false;
    },
  },
});
</script>
