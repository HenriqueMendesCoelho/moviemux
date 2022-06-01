import { defineStore } from "pinia";

export const useStyleStore = defineStore("StyleStore", {
    state: () => {
        return {
            backgroundColor: "#0b0e14",
            sideBarWidth: "calc(4rem + 32px)",
            is_expanded: false,
        };
    },
    getters: {
        getMarginSideBar(state) {
            const is_expanded =
                localStorage.getItem("is_expanded") == "true" ? true : false;

            state.is_expanded = is_expanded;

            is_expanded ? (state.sideBarWidth = "320px") : "calc(4rem + 32px)";
            return state.sideBarWidth;
        },
    },
    actions: {
        ToggleMenuStore() {
            this.is_expanded ? this.collapseMenu() : this.expandMenu();
        },
        collapseMenu() {
            this.is_expanded = false;
            this.sideBarWidth = "calc(4rem + 32px)";
        },
        expandMenu() {
            this.is_expanded = true;
            this.sideBarWidth = "320px";
        },
        setIsExpanded(newValue: boolean) {
            this.is_expanded = newValue;
        },
    },
});
