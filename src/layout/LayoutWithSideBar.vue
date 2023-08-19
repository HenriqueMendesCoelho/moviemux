<template>
  <SideBar />
  <router-view v-slot="{ Component }">
    <KeepAlive :include="['HomePage', 'DiscoverMoviesPage']">
      <component :class="layoutSettings.isSideBarExpanded ? 'expanded-sidebar' : 'not-expanded-sidebar'" :is="Component" />
    </KeepAlive>
  </router-view>
  <DialogLogin v-model="showDialogLogin" :actionLogin="login" />
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapState } from 'pinia';

import { useUserStore } from 'src/stores/UserStore';
import { useStyleStore } from 'src/stores/StyleStore';

import SideBar from 'src/components/shared/sidebar/SideBar.vue';
import DialogLogin from 'src/components/login/DialogLogin.vue';

export default defineComponent({
  name: 'LayoutWithSideBar',
  components: {
    SideBar,
    DialogLogin,
  },
  computed: {
    ...mapState(useUserStore, ['user', 'showDialogLogin']),
    ...mapState(useStyleStore, ['layoutSettings']),
  },
  methods: {
    login() {
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
