<template>
    <main>
        <div class="panel-navigation">
            <button :class="{ 'active': panel_access}" class="btn-left-bordered" @click="panel_access = true, panel_invite = false, panel_searchs = false">
                Gerencimento usuários
            </button>
            <button :class="{ 'active': panel_invite}" @click="panel_invite = true, panel_access = false, panel_searchs = false">
                Códigos de convite
            </button>
            <button :class="{ 'active': panel_searchs}" class="btn-right-bordered" @click="panel_searchs = true, panel_access = false, panel_invite = false">
                Buscas
            </button>
        </div>
        <div id="container-access" class="div-container" v-show="panel_access">
            <div class="div-panel">
                <h2>Gerencimento de conta de usuário</h2>
                <div class="textfield textfield-access">
                    <label for="email">E-mail usuário alvo</label>
                    <input type="text" name="email" placeholder="Digite..."/>
                </div>
                <div class="textfield-buttons textfield-buttons-access">
                    <button class="btn btn-success" type="submit">Promover administrador</button>
                    <button class="btn btn-danger" type="submit">Revogar administrador</button>
                </div>
                <div class="textfield-buttons textfield-buttons-access">
                    <button class="btn btn-danger" type="submit">Deletar usuário</button>
                </div>
                <div class="textfield-buttons textfield-buttons-access">
                    <button class="btn btn-warning input" type="submit">Bloquear usuário</button>
                </div>
                <div class="textfield textfield-access">
                    <label for="email">Senha</label>
                    <input type="password" name="password" placeholder="Insira a senha para confirmação..."/>
                </div>
            </div>
        </div>
        <div id="container-invite" class="div-container" v-show="panel_invite">
            <div id="div-panel-invite" class="div-panel">
                <h2>Convites</h2>
                <div class="textfield-buttons textfield-buttons-invites">
                    <button id="btn-create-invites" :class="{ 'active': panel_invite_create}" class="button-std btn-left-bordered" @click="panel_invite_create = true, panel_invite_search = false">
                        Criar convite
                    </button>
                    <button id="btn-search-invites" :class="{ 'active': panel_invite_search}" class="button-std btn-right-bordered" @click="panel_invite_search = true, panel_invite_create = false">
                        Buscar convites criados
                    </button>
                </div>
            </div>
        </div>
        <div id="container-invite" class="div-container" v-show="panel_searchs">
            <h2>Buscas gerais</h2>
            <div class="div-panel">

            </div>
        </div>
    </main>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
    data() {
        return {
            panel_access: true,
            panel_invite: false,
            panel_searchs: false,
            panel_invite_create: true,
            panel_invite_search: false,
        }
    }
})
</script>


<style lang="scss" scoped>
    main{
        margin-left: 6rem;
        margin-top: 1.5rem;

        overflow: hidden;

        max-width: 100%;
        height: calc(100vh - 24px);

        color: var(--light-grey2);

        overflow: hidden;

        

        background-color: var(--grey-dark2);
        //border: solid 5px pink;
        border-top-left-radius: 10px;

        .panel-navigation {
            display: flex;
            width: 100%;
            height: 15%;
            padding-bottom: 15px;

            justify-content: center;
            align-items: flex-end;

            button {
                font-weight: 500;

                height: 40%;

                width: 100%;

                text-transform: uppercase;

                color: var(--light-grey2);
                background-color: var(--dark-alt);
                font-weight: 400;
                box-shadow: 0 5px 30px var(--shadow);;

                &:hover {
                    background-color: var(--dark-alt2);
                    border: solid 3px var(--dark-alt);

                    color: var(--primary);
                }
            }

            .active {
                background-color: var(--dark-alt2);
                border: solid 3px var(--dark-alt);

                color: var(--primary);
            }
        }

        .btn-left-bordered {
            border-top-left-radius: 15px;
            border-end-start-radius: 15px;
            border-right: 1px solid rgba(255, 255, 255, .2);
        }

        .btn-right-bordered {
            border-end-end-radius: 15px;
            border-start-end-radius: 15px;
            border-left: 1px solid rgba(255, 255, 255, .2);
        }

        .div-container {
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            align-items: center;

            padding: 15px;

            height: 85%;
            max-width: 100%;

            //border: solid 5px green;

            overflow: hidden;

            .div-panel {
                width: 60%;
                height: 100%;
                background-color: var(--grey-mid);

                border-radius: 15px;
                box-shadow: 0 5px 30px var(--shadow);
                display: flex;
                flex-direction: column;

                justify-content: center;
                align-items: center;

                .textfield {
                    width: 80%;
                    display: flex;
                    flex-direction: column;
                    align-content: center;
                    justify-content: center;

                    //border: solid 5px purple;

                    input {
                        border: none;
                        border-radius: 10px;
                        padding: 10px;
                        background: var(--dark-alt);
                        color: var(--light-grey2);
                        font-size: 12pt;
                        box-shadow: 0 10px 30px var(--shadow);
                        outline: none;
                        box-sizing: border-box;

                        box-shadow: 0 5px 30px var(--shadow);
                    }

                    input::placeholder {
                        color: var(--light-grey);
                    }
                }

                .textfield-buttons {
                    display: flex;
                    width: 80%;

                    align-content: center;
                    justify-content: center;

                    button {
                        width: 100%;

                        text-transform: uppercase;

                        font-weight: 500;

                        box-shadow: 0 5px 30px var(--shadow);
                    }
                }

                .textfield-access {
                    margin: 2rem 0px;
                }

                .textfield-buttons-access {
                    margin: 2rem 0px;
                }
            }
            
            .button-std {
                font-weight: 500;

                height: 3rem;

                width: 100%;

                text-transform: uppercase;

                color: var(--light-grey2);
                background-color: var(--dark-alt);
                font-weight: 400;
                box-shadow: 0 5px 30px var(--shadow);;

                &:hover {
                    background-color: var(--dark-alt2);
                    border: solid 3px var(--dark-alt);

                    color: var(--primary);
                }
            }

            .active {
                background-color: var(--dark-alt2);
                border: solid 3px var(--dark-alt);

                color: var(--primary);
            }

            #div-panel-invite {
                justify-content: flex-start;
                padding: 4rem;
            }

            .textfield-buttons-invites {
                margin: 2rem 0px;
            }
        }
    }
</style>>