<template>
  <q-btn
    class="mobile-only btn-open-sidebar"
    style="color: white"
    icon="keyboard_double_arrow_right"
    size="md"
    color="grey-mid"
    rounded
    @click="ToggleMenu"
    v-if="false"
  />
  <aside :class="`${layoutSettings.isSideBarExpanded && 'is-expanded'}`" class="overflow-hidden-y">
    <div class="row logo">
      <router-link to="/home">
        <img src="/src/assets/logo-kronus.png" alt="logo" draggable="false" style="z-index: 11" />
      </router-link>
    </div>
    <div class="menu-toggle-wrap">
      <button class="menu-toggle" @click="ToggleMenu">
        <span class="material-icons"> keyboard_double_arrow_right </span>
      </button>
    </div>
    <p v-if="showTextsSideBar">Olá, {{ user.name }}</p>
    <h3>Menu</h3>
    <div class="menu menu-scroll">
      <router-link :to="{ name: 'home' }" class="button">
        <span class="material-icons">home</span>
        <span class="text" v-if="showTextsSideBar">Home</span>
        <CustomTooltip anchor="top right" :offset="[35, 0]" v-if="!layoutSettings.isSideBarExpanded" :delay="500">HOME</CustomTooltip>
      </router-link>
      <router-link :to="{ name: 'adm' }" class="button" v-if="userStore.isAdmin">
        <span class="material-icons">admin_panel_settings</span>
        <span class="text" v-if="showTextsSideBar">Painel ADM</span>
        <CustomTooltip anchor="top right" :offset="[50, 0]" v-if="!layoutSettings.isSideBarExpanded" :delay="500">PAINEL ADM</CustomTooltip>
      </router-link>
      <router-link :to="{ name: 'profile' }" class="button">
        <span class="material-icons">person</span>
        <span class="text" v-if="showTextsSideBar">Perfil</span>
        <CustomTooltip anchor="top right" :offset="[35, 0]" v-if="!layoutSettings.isSideBarExpanded" :delay="500">PERFIL</CustomTooltip>
      </router-link>
      <router-link :to="{ name: 'add' }" class="button">
        <span class="material-icons">add</span>
        <span class="text" v-if="showTextsSideBar" id="textAddMovie">Adicionar Filme</span>
        <CustomTooltip anchor="top right" :offset="[65, 0]" v-if="!layoutSettings.isSideBarExpanded" :delay="500"
          >ADICIONAR FILME</CustomTooltip
        >
      </router-link>
      <router-link :to="{ name: 'charts' }" class="button">
        <span class="material-icons">dashboard</span>
        <span class="text" v-if="showTextsSideBar" id="textAddMovie">Dashboard</span>
        <CustomTooltip anchor="top right" :offset="[65, 0]" v-if="!layoutSettings.isSideBarExpanded" :delay="500">DASHBOARD</CustomTooltip>
      </router-link>
      <router-link :to="{ name: 'discoverMovies' }" class="button">
        <span class="material-icons">search</span>
        <span class="text" v-if="showTextsSideBar" id="textAddMovie">Descobrir Filmes</span>
        <CustomTooltip anchor="top right" :offset="[65, 0]" v-if="!layoutSettings.isSideBarExpanded" :delay="500"
          >DESCOBRIR FILMES</CustomTooltip
        >
      </router-link>
      <router-link :to="{ name: 'wishlist' }" class="button">
        <span class="material-icons">list</span>
        <span class="text" v-if="showTextsSideBar" id="textAddMovie">Lista de Filmes</span>
        <CustomTooltip anchor="top right" :offset="[65, 0]" v-if="!layoutSettings.isSideBarExpanded" :delay="500"
          >LISTA DE FILMES</CustomTooltip
        >
      </router-link>
    </div>
    <div class="flex"></div>
    <div class="menu menu-bottom">
      <button class="button" @click="styleStore.darkThemeToggle()">
        <span class="material-icons" draggable="false" v-if="layoutSettings.darkMode"> light_mode </span>
        <span class="material-icons" draggable="false" v-else> dark_mode </span>
        <span class="text" draggable="false">Tema</span>
        <CustomTooltip anchor="top right" :offset="[30, 0]" v-if="!layoutSettings.isSideBarExpanded" :delay="500">Tema</CustomTooltip>
      </button>
      <router-link @click="logout" to="/" class="button">
        <span class="material-icons">logout</span>
        <span class="text">Sair</span>
        <CustomTooltip anchor="top right" :offset="[30, 0]" v-if="!layoutSettings.isSideBarExpanded" :delay="500">Sair</CustomTooltip>
      </router-link>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { Cookies } from 'quasar';

import { useUserStore } from 'src/stores/UserStore';
import { useStyleStore } from 'src/stores/StyleStore';

import CustomTooltip from 'src/components/shared/customTooltip/CustomTooltip.vue';

const userStore = useUserStore();
const styleStore = useStyleStore();

const showTextsSideBar = ref(false);

const layoutSettings = computed(() => styleStore.layoutSettings);
const user = computed(() => userStore.user);

onMounted(() => {
  showTextsSideBar.value = layoutSettings.value.isSideBarExpanded;
});

watch(
  () => layoutSettings.value,
  (val) => {
    if (val.isSideBarExpanded) {
      setTimeout(() => {
        showTextsSideBar.value = true;
        return;
      }, 80);
    }
    showTextsSideBar.value = false;
  },
  { deep: true }
);

function ToggleMenu() {
  layoutSettings.value.isSideBarExpanded = !layoutSettings.value.isSideBarExpanded;
}
function logout() {
  userStore.$reset();
  Cookies.remove('auth-kb');
}
</script>

<style lang="scss" scoped>
.btn-open-sidebar {
  position: fixed;
  z-index: 10;
  top: 30px;
  left: 20px;
}

aside {
  display: flex;
  flex-direction: column;
  width: calc(3rem + 32px);
  overflow: hidden;
  height: 100vh;
  padding: 1rem;

  position: fixed;
  z-index: 10;

  background-color: var(--grey-dark2);
  color: var(--light-grey2);

  transition: 0.2s ease-out;

  @media only screen and (max-width: $breakpoint-md-min) {
    &:not(.is-expanded) {
      visibility: hidden;
      transform: translateX(-80px);
      transition: 0.2s ease-out;
    }
  }

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

    position: relative;
    top: 0;
    transition: 0.2s ease-out;

    .menu-toggle {
      .material-icons {
        transition: 0.2s ease-out;
        font-size: 2rem;
        color: var(--light-grey2);
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
    margin: auto -1rem;
    transition: 0.2s ease-out;

    @media only screen and (max-width: $breakpoint-md-min) {
      transition: none;
    }

    button {
      width: 100%;
    }

    .button {
      display: flex;
      align-items: center;
      text-decoration: none;
      padding: 0.5rem 1rem;
      cursor: pointer;

      .material-icons {
        font-size: 2rem;
        color: var(--light-grey2);
      }

      .text {
        color: var(--light-grey2);
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

  .menu-scroll {
    margin-top: -1rem !important;
    overflow-y: auto;
    max-height: 100%;
  }

  .menu-bottom {
    margin-bottom: -1rem !important;
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
}
</style>
