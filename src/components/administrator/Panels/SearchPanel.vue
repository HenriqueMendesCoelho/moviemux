<template>
    <div id="container-search" class="div-container">
        <div class="div-panel">
            <h2>Buscas gerais</h2>
            <button>Enviar</button>
        </div>
    </div>
</template>

<script lang="ts">
import { useAdministratorStore } from "@/stores/AdministratorStore";
import { mapState } from "pinia";
import { defineComponent } from "vue-demi";

export default defineComponent({
    computed: {
        ...mapState(useAdministratorStore, ["AdministratorSelectBar"]),
    },
});
</script>

<style lang="scss">
@import "@/components/administrator/scss/AdministratorPanel.scss";
</style>
