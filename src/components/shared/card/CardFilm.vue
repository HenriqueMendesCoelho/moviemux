<template>
    <div class="main">
        <h5>{{ title }}</h5>
        <img :src="url" :alt="title" />
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
    props: {
        url: {
            type: String,
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
    },
});
</script>

<style lang="scss" scoped>
.main {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100%;
    width: 1vw;

    background: var(--light-grey);
}
</style>
