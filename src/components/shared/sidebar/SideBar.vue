<template>
  <aside :class="`${isExpanded && 'is-expanded'}`">
    <div class="row logo">
      <router-link to="/home">
        <img src="../../../assets/logo-kronus.png" alt="logo" draggable="false" style="z-index: 99" />
      </router-link>
    </div>
    <div class="menu-toggle-wrap">
      <button class="menu-toggle" @click="ToggleMenu">
        <span class="material-icons"> keyboard_double_arrow_right </span>
      </button>
    </div>
    <p v-if="showTextsSideBar">Olá, {{ user.name }}</p>
    <h3>Menu</h3>
    <div class="menu">
      <router-link to="/home" class="button">
        <span class="material-icons">home</span>
        <span class="text" v-if="showTextsSideBar">Home</span>
        <CustomTooltip anchor="top right" :offset="[35, 0]" v-if="!isExpanded" :delay="500">HOME</CustomTooltip>
      </router-link>
      <router-link to="/adm" class="button" v-if="isAdmin">
        <span class="material-icons">admin_panel_settings</span>
        <span class="text" v-if="showTextsSideBar">Painel ADM</span>
        <CustomTooltip anchor="top right" :offset="[50, 0]" v-if="!isExpanded" :delay="500">PAINEL ADM</CustomTooltip>
      </router-link>
      <router-link to="/profile" class="button">
        <span class="material-icons">person</span>
        <span class="text" v-if="showTextsSideBar">PERFIL</span>
        <CustomTooltip anchor="top right" :offset="[35, 0]" v-if="!isExpanded" :delay="500">PERFIL</CustomTooltip>
      </router-link>
      <router-link to="/movie/add" class="button">
        <span class="material-icons">add</span>
        <span class="text" v-if="showTextsSideBar" id="textAddMovie">ADICIONAR FILME</span>
        <CustomTooltip anchor="top right" :offset="[65, 0]" v-if="!isExpanded" :delay="500">ADICIONAR FILME</CustomTooltip>
      </router-link>
      <router-link to="/movie/discover" class="button" style="position: relative">
        <q-badge class="q-mr-sm" label="novo" color="kb-primary" rounded floating />
        <span class="material-icons">search</span>
        <span class="text" v-if="showTextsSideBar" id="textAddMovie">DESCOBRIR FILMES</span>
        <CustomTooltip anchor="top right" :offset="[65, 0]" v-if="!isExpanded" :delay="500">DESCOBRIR FILMES</CustomTooltip>
      </router-link>
    </div>

    <div class="flex"></div>
    <div class="menu justify-start">
      <button class="button" @click="darkThemeToggle()">
        <span class="material-icons" draggable="false" v-if="layoutSettings.darkMode"> light_mode </span>
        <span class="material-icons" draggable="false" v-else> dark_mode </span>
        <span class="text" draggable="false">Tema</span>
        <CustomTooltip anchor="top right" :offset="[30, 0]" v-if="!isExpanded" :delay="500">Tema</CustomTooltip>
      </button>
      <router-link @click="logout" to="/" class="button">
        <span class="material-icons">logout</span>
        <span class="text">Sair</span>
        <CustomTooltip anchor="top right" :offset="[30, 0]" v-if="!isExpanded" :delay="500">Sair</CustomTooltip>
      </router-link>
    </div>
  </aside>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapActions, mapState } from 'pinia';

import { useUserStore } from 'src/stores/UserStore';
import { useStyleStore } from 'src/stores/StyleStore';

import CustomTooltip from '../customTooltip/CustomTooltip.vue';

export default defineComponent({
  name: 'SideBar',
  components: {
    CustomTooltip,
  },
  data() {
    return {
      isExpanded: false,
      showTextsSideBar: false,
    };
  },
  computed: {
    ...mapState(useStyleStore, ['backgroundColor', 'sideBarWidth', 'layoutSettings']),
    ...mapState(useUserStore, ['user']),
    isAdmin() {
      return this.user.roles.includes('ADM');
    },
  },
  methods: {
    ...mapActions(useStyleStore, ['ToggleMenuStore', 'setIsExpanded', 'darkThemeToggle']),
    ToggleMenu() {
      this.isExpanded = !this.isExpanded;
      this.ToggleMenuStore();
      localStorage.setItem('is_expanded', this.isExpanded.toString());
    },
    logout() {
      const userStore = useUserStore();
      userStore.$reset();
      localStorage.clear();
    },
  },
  beforeMount() {
    this.isExpanded = localStorage.getItem('is_expanded') == 'true' ? true : false;
  },
  watch: {
    isExpanded(val) {
      if (val) {
        setTimeout(() => {
          this.showTextsSideBar = true;
          return;
        }, 80);
      }
      this.showTextsSideBar = false;
      return;
    },
  },
});
</script>

<style lang="scss" scoped>
aside {
  display: flex;
  flex-direction: column;
  width: calc(3rem + 32px);
  overflow: hidden;
  min-height: 100vh;
  padding: 1rem;

  position: fixed;
  z-index: 10;

  background-color: var(--grey-dark2);
  color: var(--light-grey2);

  transition: 0.2s ease-out;
  .logo {
    margin-bottom: 1rem;
    width: 3rem;
    z-index: 5;
    img {
      border-radius: 50%;
      width: 100%;

      &:hover {
        box-shadow: 0px 0px 10px 1px var(--primary);

        transition: 0.2s ease-in-out;
      }
    }
  }

  .flex {
    flex: 1 1 0;
  }

  .menu-toggle-wrap {
    display: flex;
    justify-content: flex-end;
    //margin-bottom: 1rem;

    position: relative;
    top: 0;
    transition: 0.2s ease-out;

    .menu-toggle {
      transition: 0.2s ease-out;

      .material-icons {
        font-size: 2rem;
        color: var(--light-grey2);

        transition: 0.2s ease-out;
      }

      &:hover {
        .material-icons {
          color: var(--primary);
          transform: translateX(0.5rem);
        }
      }
    }
  }

  h3,
  .button .text {
    opacity: 0;
    transition: 0.3s ease-out;
  }

  h3 {
    color: var(--light-grey);
    font-size: 1rem;
    margin-bottom: 1rem;
    text-transform: uppercase;
  }

  p {
    color: var(--light-grey2);
  }

  .menu {
    margin: -1rem;

    button {
      width: 100%;
    }

    .button {
      display: flex;
      align-items: center;
      text-decoration: none;

      padding: 0.5rem 1rem;
      transition: 0.2s ease-out;

      cursor: pointer;

      .material-icons {
        font-size: 2rem;
        color: var(--light-grey2);

        transition: 0.2s ease-out;
      }

      .text {
        color: var(--light-grey2);

        transition: 0.2 ease out;
      }

      &:hover,
      .router-link-exact-active {
        background-color: var(--dark-alt);

        .material-icons,
        .text {
          color: var(--primary);
        }
      }

      &.router-link-exact-active {
        border-right: 5px solid var(--primary);
      }
    }
  }

  &.is-expanded {
    width: var(--sidebar-width);

    .menu-toggle-wrap {
      top: -3rem;
      .menu-toggle {
        transform: rotate(-180deg);
      }
    }

    h3,
    .button .text {
      opacity: 1;
    }

    .button {
      .material-icons {
        margin-right: 1rem;
      }
    }
  }

  @media (max-width: 768px) {
    position: fixed;
    z-index: 99;
  }
}
</style>
