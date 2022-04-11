<template>
    <main>
        <div class="main">
            <div class="last-films">

                <div class="last-filmes-title">
                    <span class="material-icons" @click="lastFilms_expanded = !lastFilms_expanded">expand_less</span>
                    <h4>Últimos filmes</h4>
                </div>

                <div class="card-last-films">
                    
                </div>
            </div>

            <div class="all-films">

            </div>
        </div>
    </main>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
    data() {
        return {
            lastFilms_expanded: true,
            films: [
                {
                    titulo_ptbr: "Carros 3",
                    titulo_us: "Cars 3",
                    descrição: "Filme de carro bala demais com o relampago marquinhos",
                    bannerUrl: "https://i.imgur.com/KtO32vW.jpeg",
                    trailerUrlDub: "https://www.youtube.com/watch?v=BuvJZGLclAU",
                    trailerUrlLeg: "https://www.youtube.com/watch?v=BuvJZGLclAU",
                    notas: [
                        {
                            user: "Henrique",
                            nota: 10
                        }
                    ]
                },
                {
                    titulo_ptbr: "Carros 3",
                    titulo_us: "Cars 3",
                    descrição: "Filme de carro bala demais com o relampago marquinhos",
                    bannerUrl: "https://i.imgur.com/KtO32vW.jpeg",
                    trailerUrlDub: "https://www.youtube.com/watch?v=BuvJZGLclAU",
                    trailerUrlLeg: "https://www.youtube.com/watch?v=BuvJZGLclAU",
                    notas: [
                        {
                            user: "Henrique",
                            nota: 10
                        }
                    ]
                }
            ]
        }
    }
})
</script>

<style lang="scss" scoped>
.main {
    width: 100%;
    height: 100%;
    //border: 5px solid pink;
    display: flex;
    flex-direction: column;
    .last-films {
        //height: 3.3rem;
        height: 30%;
        width: 100%;
        display: flex;
        flex-direction: column;
        //border: 5px solid darkgray;
        border-radius: 20px;
        overflow: hidden;

        position: relative;
        
        background-color: var(--grey-dark2);

        transition: 0.2s ease-out;

        .material-icons{
            color: var(--light-grey2);
            font-size: 2rem;
            transition: 0.2s ease-out;

            &:hover {
                color: var(--primary);
                cursor: pointer;

                transform: translateY(-0.5rem);
            }
        }

        .last-filmes-title {
            display: flex;
            height: 15%;
            margin-top: 10px;
            //border: 5px solid purple;
            border-radius: 20px;

            h4 {
                margin-left: 1rem;
                color: var(--light-grey2);
            }

        }
        .card-last-films {
            height: 85%;
            width: 100%;
            display: flex;
            //border: 5px solid yellow;
            
            border-radius: 20px;

            .icons-card-last-films{
                height: 100%;
                width: 5%;
                border: 5px solid blue;
            }
        }
        
        @media (max-width: 768px) {
            height: 40vh;
            width: auto;
        }
    }

    .all-films {
        height: 70%;
        width: 100%;
        //border: 5px solid green;

        @media (max-width: 768px) {
            height: 56vh;
            width: auto;
        }
    }
}
</style>