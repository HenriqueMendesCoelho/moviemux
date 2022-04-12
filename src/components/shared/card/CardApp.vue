<template>
    <div class="card-lastfilm">
        <img :src="url" :alt="title">
        <h6>{{ title }}</h6>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue"

export default defineComponent({
    props: ['title', 'url']
})
</script>

<style lang="scss" scoped>
    .card-lastfilm{
        display: flex;
        flex-direction: column;
        width: 10vw;
        max-height:95%;
        margin: 10px 2rem 0 0;

        justify-content: flex-start;
        align-items: center;
        overflow: hidden;

        color: black;
        background: var(--light-grey);
        border-radius: 15px;

        h6 {
            font-size: 10pt;
            margin-top: 10px;
        }

        img {
            margin-top: 10px;
            max-width:100%;
            max-height:80%;
            border-radius: 10px;
        }
    }
</style>