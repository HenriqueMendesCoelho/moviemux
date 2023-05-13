<template>
  <SideBar />
  <router-view v-slot="{ Component }">
    <KeepAlive :include="['HomePage', 'DiscoverMoviesPage']">
      <component :class="isExpanded ? 'expanded-sidebar' : 'not-expanded-sidebar'" :is="Component" />
    </KeepAlive>
  </router-view>
  <DialogLogin v-model="showDialogLogin" :actionLogin="login" />
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapState } from 'pinia';

import { useUserStore } from '@/stores/UserStore';
import { useStyleStore } from '@/stores/StyleStore';

import SideBar from '@/components/shared/sidebar/SideBar.vue';
import DialogLogin from '@/components/login/DialogLogin.vue';

export default defineComponent({
  name: 'LayoutWithSideBar',
  components: {
    SideBar,
    DialogLogin,
  },
  computed: {
    ...mapState(useUserStore, ['user', 'showDialogLogin']),
    ...mapState(useStyleStore, ['isExpanded']),
  },
  methods: {
    login() {
      //Chamar api e salvar token
      this.user.isLoged = false;
    },
  },
});
</script>

<style lang="scss" scoped>
.expanded-sidebar {
  margin-left: 320px;
  min-width: calc(100vw - 320px);
}

.not-expanded-sidebar {
  margin-left: 7rem;
  min-width: calc(100vw - 7rem);
}
</style>
