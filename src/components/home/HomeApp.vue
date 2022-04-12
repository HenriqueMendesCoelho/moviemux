<template>
    <main>
        <div class="div-lastfilms" :style="lastFilms_height">
            <div class="div-title">
                <span class="material-icons" :style="lastFilms_expanded" @click="isVisibleLastFilms">
                    expand_less
                </span>
                <h4>Últimos Filmes</h4>
            </div>
            <div class="div-cards-lastfilm">
                <card-app v-for="film in films.slice(0, 5)" :title="film.titulo" :url="film.url" :key="film.id" :id="film.id"/>
            </div>
        </div>
        <div class="div-allfilms">
            <h1>All films</h1>
        </div>
    </main>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import CardApp from "../shared/card/CardApp.vue"

export default defineComponent({
    components: {
        "card-app": CardApp
    },
    data() {
        return {
            lastFilms_expanded: "transform: rotate(0deg);",
            lastFilms_height: 'height: 40%;',
            films: [
                {
                    id: 1,
                    titulo: "Carros 3",
                    url: "https://img.elo7.com.br/product/zoom/1B4DF7D/banner-festa-carros-painel.jpg"
                },
                {
                    id: 2,
                    titulo: "Carros 3",
                    url: "https://img.elo7.com.br/product/zoom/1B4DF7D/banner-festa-carros-painel.jpg"
                },
                {
                    id: 3,
                    titulo: "Carros 3",
                    url: "https://img.elo7.com.br/product/zoom/1B4DF7D/banner-festa-carros-painel.jpg"
                },
                {
                    id: 4,
                    titulo: "Carros 3",
                    url: "https://img.elo7.com.br/product/zoom/1B4DF7D/banner-festa-carros-painel.jpg"
                },
                {
                    id: 5,
                    titulo: "Carros 3",
                    url: "https://media.discordapp.net/attachments/544455631269134347/743880454985482360/unknown.png?width=925&height=671"
                },
                {
                    id: 6,
                    titulo: "Carros 3",
                    url: ""
                },
                {
                    id: 7,
                    titulo: "Carros 3",
                    url: ""
                },
                {
                    id: 8,
                    titulo: "Carros 3",
                    url: ""
                }
            ]
        }
    },
    methods: {
        isVisibleLastFilms() {
            if(this.lastFilms_height == "height: 40%;") {
                this.lastFilms_height = "height: 8%;";
            } else {
                this.lastFilms_height = "height: 40%;";
            }

            if(this.lastFilms_expanded == "transform: rotate(0deg);") {
                this.lastFilms_expanded ="transform: rotate(-180deg);";
            } else {
                this.lastFilms_expanded = "transform: rotate(0deg);";
            }
        }
    }
})
</script>

<style lang="scss" scoped>
    main {
        display: flex;
        flex-direction: column;
        margin-top: 1.5rem;
        margin-left: 1.5rem;

        border-top-left-radius: 10px;
        background: var(--grey-dark2);
        box-shadow: 0 10px 30px var(--shadow);
        .div-lastfilms {
            display: flex;
            flex-direction: column;
            padding: 1rem;

            transition: 0.2s ease-out;

            //height: 10%;
            width: 100%;

            color: var(--light-grey2);
            border-radius: 10px;
            background-color: var(--grey-mid);
            box-shadow: 0 5px 30px var(--shadow);

            .div-title {
                display: flex;
                justify-content: flex-start;
                align-items: center;

                transition: 0.2s ease-out;
                
                border-radius: 10px;
                border-bottom: 1px solid rgba(255, 255, 255, .2);

                .material-icons{
                    font-size: 2rem;
                    color: var(--light-grey2);
                    margin-right: 15px;
                    margin-top: 0px;

                    transition: 0.2s ease-out;

                    cursor: pointer;

                    &:hover {
                        color: var(--primary);
                        
                    }
                }

            }

            .div-cards-lastfilm {
                display: flex;
                justify-content: center;
                overflow: hidden;
                max-height:100%;

                transition: 0.2s ease-out;
            }
        }

        //border: 5px solid black;
    }
</style>