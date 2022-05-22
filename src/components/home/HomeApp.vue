<template>
    <main>
        <div class="div-lastfilms" :style="lastFilms_height">
            <div class="div-title">
                <span
                    class="material-icons"
                    :style="lastFilms_expanded"
                    @click="isVisibleLastFilms"
                    draggable="false"
                >
                    expand_less
                </span>
                <h4>Últimos Filmes</h4>
            </div>
            <div class="div-cards-lastfilm">
                <card-app
                    v-for="film in films.slice(0, 8)"
                    :title="film.titulo"
                    :url="film.url"
                    :key="film.id"
                    :id="film.id"
                    v-show="lastFilms_height == 'height: 40%;'"
                />
            </div>
        </div>
        <div class="div-allfilms">
            <div class="search-input">
                <input
                    type="text"
                    name="search"
                    placeholder="Digite..."
                    v-model="imageCheck"
                />
                <button @click="checkImage(imageCheck)">BUSCAR</button>
            </div>
            <div class="container-cards-films">
                <div class="cards-films" v-for="film in films" :key="film.id">
                    <img :src="film.url" :alt="film.titulo" draggable="false" />
                </div>
            </div>
        </div>
    </main>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import CardApp from "../shared/card/CardApp.vue";

export default defineComponent({
    components: {
        "card-app": CardApp,
    },
    data() {
        return {
            lastFilms_expanded: "transform: rotate(0deg);",
            lastFilms_height: "height: 40%;",
            imageCheck: "",
            films: [
                {
                    id: 1,
                    titulo: "X-MEN",
                    url: "https://i.pinimg.com/564x/39/b1/e2/39b1e25ff4d10111ce777fa8f0fb35c4.jpg",
                },
                {
                    id: 2,
                    titulo: "Jpolin",
                    url: "https://i.pinimg.com/564x/e9/2d/fc/e92dfc153392babc282f9da35470c835.jpg",
                },
                {
                    id: 3,
                    titulo: "Friends with...",
                    url: "https://i.pinimg.com/564x/fc/b1/02/fcb102c9a43165e9c665892d1c9af070.jpg",
                },
                {
                    id: 4,
                    titulo: "Aliens",
                    url: "https://i.pinimg.com/564x/b6/f7/41/b6f741e84097a01a809a179aa4c57843.jpg",
                },
                {
                    id: 5,
                    titulo: "Rambo first...",
                    url: "https://i.pinimg.com/564x/ff/5e/66/ff5e66073290ccca3af13c8b7301dca6.jpg",
                },
                {
                    id: 6,
                    titulo: "dunkirk",
                    url: "https://i.pinimg.com/564x/aa/26/9b/aa269bf3f8e4ae370c95ec1ff6c23b00.jpg",
                },
                {
                    id: 7,
                    titulo: "Toretto",
                    url: "https://i.pinimg.com/564x/f6/d4/69/f6d469ebccf005908fc33999d8430ba6.jpg",
                },
                {
                    id: 8,
                    titulo: "Professor an...",
                    url: "https://i.pinimg.com/564x/e3/ba/87/e3ba8722d5cde587d5eaad9eb65628ca.jpg",
                },
                {
                    id: 9,
                    titulo: "Professor an...",
                    url: "https://i.pinimg.com/564x/e3/ba/87/e3ba8722d5cde587d5eaad9eb65628ca.jpg",
                },
                {
                    id: 10,
                    titulo: "Professor an...",
                    url: "https://i.pinimg.com/564x/e3/ba/87/e3ba8722d5cde587d5eaad9eb65628ca.jpg",
                },
                {
                    id: 11,
                    titulo: "Professor an...",
                    url: "https://i.pinimg.com/564x/e3/ba/87/e3ba8722d5cde587d5eaad9eb65628ca.jpg",
                },
                {
                    id: 12,
                    titulo: "Professor an...",
                    url: "https://i.pinimg.com/564x/e3/ba/87/e3ba8722d5cde587d5eaad9eb65628ca.jpg",
                },
                {
                    id: 13,
                    titulo: "Professor an...",
                    url: "https://media.fstatic.com/x5p3n0eeoWdJlbDpXd0_ZaJo1cw=/290x478/smart/media/movies/covers/2022/02/no_exit_ver2.jpg",
                },
                {
                    id: 14,
                    titulo: "Professor an...",
                    url: "https://i.pinimg.com/564x/e3/ba/87/e3ba8722d5cde587d5eaad9eb65628ca.jpg",
                },
                {
                    id: 15,
                    titulo: "Professor an...",
                    url: "https://i.imgur.com/FyuYAxi.jpg",
                },
                {
                    id: 16,
                    titulo: "Professor an...",
                    url: "https://i.pinimg.com/564x/e3/ba/87/e3ba8722d5cde587d5eaad9eb65628ca.jpg",
                },
                {
                    id: 17,
                    titulo: "Professor an...",
                    url: "https://i.pinimg.com/564x/e3/ba/87/e3ba8722d5cde587d5eaad9eb65628ca.jpg",
                },
                {
                    id: 18,
                    titulo: "Professor an...",
                    url: "https://i.pinimg.com/564x/e3/ba/87/e3ba8722d5cde587d5eaad9eb65628ca.jpg",
                },
            ],
        };
    },
    methods: {
        isVisibleLastFilms() {
            if (this.lastFilms_height == "height: 40%;") {
                this.lastFilms_height = "height: 8%;";
            } else {
                this.lastFilms_height = "height: 40%;";
            }

            if (this.lastFilms_expanded == "transform: rotate(0deg);") {
                this.lastFilms_expanded = "transform: rotate(-180deg);";
            } else {
                this.lastFilms_expanded = "transform: rotate(0deg);";
            }
        },
        checkImage(url: string) {
            // https://i.imgur.com/fj6Bn7O.png >> Imagem com Altura de 75px e largura de 1200 px
            const img = new Image();
            img.addEventListener("load", function () {
                let errors;
                if (this.naturalHeight < 350)
                    errors = "Altura da imagem deve ser no mínimo 350 pixels";

                if (this.naturalWidth > 1100 && errors) {
                    errors =
                        errors + " e larguradeve ter no máximo 1100 pixels";
                } else if (this.naturalWidth > 1100 && !errors) {
                    errors = "A largura máxima da imgagem é de 1100 pixels";
                } else if (this.naturalWidth < 550 && errors) {
                    errors = errors + " e a largura mínima é de 550 pixels";
                } else if (this.naturalWidth < 550 && !errors) {
                    errors =
                        errors + "Largura mínima da imagem é de 550 pixels";
                }

                if (errors) alert(errors);
            });
            img.src = url;
        },
    },
});
</script>

<style lang="scss" scoped>
main {
    display: flex;
    flex-direction: column;
    margin-top: 1.5rem;
    //margin-left: 1.5rem;
    margin-left: 6rem;
    max-width: 100%;

    overflow: hidden;

    border-top-left-radius: 10px;
    background: var(--grey-dark2);
    box-shadow: 0 10px 30px var(--shadow);

    .div-lastfilms {
        display: flex;
        flex-direction: column;
        padding: 1rem;
        overflow: hidden;
        transition: 0.2s ease-out;

        max-width: 100%;

        //height: 5vh;

        max-height: 40vh;

        color: var(--light-grey2);
        border-radius: 10px;
        background-color: var(--grey-mid);
        box-shadow: 0 5px 30px var(--shadow);

        .div-title {
            display: flex;
            justify-content: flex-start;
            align-items: center;

            max-width: 100%;

            transition: 0.2s ease-out;

            border-radius: 10px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);

            .material-icons {
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
            max-height: 100%;

            transition: 0.2s ease-out;

            @media (max-width: 768px) {
                flex-direction: column;
            }
        }
    }
    .div-allfilms {
        //border: 5px solid pink;

        margin-top: 20px;
        max-width: 100%;

        flex-direction: column;
        display: flex;
        justify-content: flex-start;
        align-content: center;

        .search-input {
            max-width: 100%;
            //border: 5px solid blue;
            height: 5vh;

            margin-bottom: 20px;

            font-size: 15pt;

            display: flex;
            align-content: flex-start;
            justify-content: flex-start;

            input {
                max-width: 100%;
                padding: 15px;
                color: var(--light-grey2);
                width: 85%;
                height: 100%;
                border-top-left-radius: 15px;
                border-end-start-radius: 15px;

                box-shadow: 0 5px 30px var(--shadow);

                box-sizing: border-box;
                border: none;
                outline: none;

                background-color: var(--grey-mid);

                input::placeholder {
                    max-width: 100%;
                    color: var(--light-grey2);

                    margin-left: 55px;
                }
            }

            button {
                background-color: var(--dark-alt);
                width: 15%;
                border-end-end-radius: 15px;
                border-start-end-radius: 15px;

                color: var(--light-grey);
                font-weight: 500;

                &:hover {
                    background-color: var(--dark-alt2);
                    border: solid 3px var(--dark-alt);

                    color: var(--primary);
                }
            }
        }

        .container-cards-films {
            display: inline-block;

            //border: 5px solid green;

            justify-content: center;
            align-items: center;
            text-align: center;

            max-width: 100%;
            height: 100%;

            .cards-films {
                display: inline-block;
                //border: 5px solid yellow;
                max-width: 100%;
                max-width: 15%;

                margin-left: 20px;
                margin-right: 20px;
                margin-bottom: 20px;

                img {
                    //border: 5px solid purple;
                    max-width: 100%;
                    max-height: 350px;

                    border-radius: 15px;

                    transition: 0.2s ease-out;

                    box-shadow: 0 5px 30px var(--shadow);

                    &:hover {
                        transform: scale(1.1);

                        transition: 0.2s ease-out;
                    }
                }
            }
        }
    }
}
</style>
