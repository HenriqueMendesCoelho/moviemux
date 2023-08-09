<template>
  <SideBar />
  <div
    ref="containerLayoutRef"
    :class="layoutSettings.isSideBarExpanded ? 'expanded-sidebar' : 'not-expanded-sidebar'"
    class="scroll"
    style="height: 100vh"
  >
    <router-view v-slot="{ Component }">
      <KeepAlive :include="['HomePage', 'DiscoverMoviesPage']">
        <component :is="Component" />
      </KeepAlive>
    </router-view>
  </div>
  <DialogLogin v-model="showDialogLogin" :actionLogin="login" />
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { mapState } from 'pinia';

import { useUserStore } from 'src/stores/UserStore';
import { useStyleStore } from 'src/stores/StyleStore';

import SideBar from './sidebar/SideBar.vue';
import DialogLogin from 'src/components/login/DialogLogin.vue';

export default defineComponent({
  name: 'LayoutWithSideBar',
  components: {
    SideBar,
    DialogLogin,
  },
  setup() {
    const containerLayoutRef = ref();
    const styleStore = useStyleStore();
    console.log(containerLayoutRef.value);

    styleStore.$onAction(({ name, args }) => {
      if (name === 'scrollToContainer') {
        console.log(args);
        containerLayoutRef.value?.scrollTo({
          top: args[0],
          left: args[1],
          behavior: args[2],
        });
      }
    });

    return {
      containerLayoutRef,
    };
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
  transition: 0.2s ease-out;
}

.not-expanded-sidebar {
  margin-left: 7rem;
  min-width: calc(100vw - 7rem);
  transition: 0.2s ease-out;
}
</style>
