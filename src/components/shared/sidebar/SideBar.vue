<template>
    <aside :class="`${is_expanded && 'is-expanded'}`">
        <div class="logo">
            <router-link to="/home">
                <img
                    src="../../../assets/logo-kronus.png"
                    alt="logo"
                    draggable="false"
                />
            </router-link>
        </div>

        <div class="menu-toggle-wrap">
            <button class="menu-toggle" @click="ToggleMenu">
                <span class="material-icons">
                    keyboard_double_arrow_right
                </span>
            </button>
        </div>

        <h3>Menu</h3>
        <div class="menu">
            <router-link to="/home" class="button">
                <span class="material-icons">home</span>
                <span class="text">Home</span>
            </router-link>
            <router-link to="/adm" class="button">
                <span class="material-icons">admin_panel_settings</span>
                <span class="text">ADM</span>
            </router-link>
        </div>

        <div class="flex"></div>
        <div class="menu">
            <button
                class="button"
                @click="darkModeFunc"
                style="opacity: 50%; cursor: not-allowed"
                disabled="true"
            >
                <span class="material-icons" draggable="false">
                    light_mode
                </span>
                <span class="text" draggable="false">Tema</span>
            </button>
            <router-link to="/" class="button">
                <span class="material-icons">logout</span>
                <span class="text">Sair</span>
            </router-link>
        </div>
    </aside>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { mapActions, mapState } from "vuex";

export default defineComponent({
    data() {
        return {
            is_expanded: false,
            teste: "teste",
        };
    },
    methods: {
        ToggleMenu() {
            this.is_expanded = !this.is_expanded;
            this.ToggleMenuStore();
            localStorage.setItem("is_expanded", this.is_expanded.toString());
        },
        ...mapActions("Style", [
            "darkModeFunc",
            "ToggleMenuStore",
            "setIsExpanded",
        ]),
    },
    beforeMount() {
        this.is_expanded =
            localStorage.getItem("is_expanded") == "true" ? true : false;
    },
    computed: {
        ...mapState("Style", ["backgroundColor", "sideBarWidth"]),
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
    z-index: 99;

    //top: 0;

    background-color: var(--grey-dark2);
    color: var(--light-grey2);

    transition: 0.2s ease-out;
    .logo {
        margin-bottom: 1rem;

        img {
            width: 3rem;
            border-radius: 50%;

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
        margin-bottom: 1rem;

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
