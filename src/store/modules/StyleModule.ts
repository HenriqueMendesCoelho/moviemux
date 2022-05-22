import { Module } from "vuex";

// eslint-disable-next-line
const movieModule: Module<any, any> = {
    state: {
        backgroundColor: "#0b0e14",
        sideBarWidth: "calc(4rem + 32px)",
        is_expanded: false,
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
    mutations: {
        // eslint-disable-next-line
        darkModeOff(state: any) {
            state.backgroundColor = "#f0ffff94";
        },
        // eslint-disable-next-line
        darkModeOn(state: any) {
            state.backgroundColor = "#0b0e14";
        },
        collapseMenu(state: any) {
            state.is_expanded = false;
            state.sideBarWidth = "calc(4rem + 32px)";
        },
        expandMenu(state: any) {
            state.is_expanded = true;
            state.sideBarWidth = "320px";
        },
    },
    actions: {
        darkModeFunc({ commit, state }) {
            state.backgroundColor == "#0b0e14"
                ? commit("darkModeOff")
                : commit("darkModeOn");
        },
        ToggleMenuStore({ commit, state }) {
            state.is_expanded ? commit("collapseMenu") : commit("expandMenu");
        },
        setIsExpanded({ commit }, newValue: boolean) {
            commit("setIsExpanded", newValue);
        },
    },
    namespaced: true,
};

export default movieModule;
