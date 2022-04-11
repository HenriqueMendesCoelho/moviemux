<template>
    <div class="main-login">
        <div class="left-login">
            <h1>Bem-vindo ao cineminha!</h1>
            <img src="../../assets/logo-kronus.png" 
                class="left-img-login" alt="logo" draggable="false" @click="forgotPass = false, createAccout = false"/>
        </div>
        <div class="right-login">
                <div class="card-login">

                    <h2 v-if="!forgotPass && !createAccout">Login</h2>
                    <h2 v-else-if="!forgotPass && createAccout">Criar nova conta</h2>
                    <h2 v-else-if="forgotPass && !createAccout">Recuperação de senha</h2>
                    <h2 v-else>Error</h2>

                    <div class="textfield">
                        <label for="user">E-mail</label>
                        <input type="text" name="email" placeholder="E-mail">
                        <p v-show="forgotPass">Insira seu e-mail para receber uma nova senha</p>
                    </div>
                    <div class="textfield" v-show="!forgotPass">
                        <label for="password">Senha</label>
                        <input type="password" name="senha" placeholder="Senha">
                        <router-link to="/" @click="forgotPass = true, button_text = 'Enviar e-mail'" v-show="!createAccout">
                            Esqueceu sua senha ?
                        </router-link>
                    </div>
                    <div class="textfield" v-show="!forgotPass && createAccout">
                        <label for="code">Código do convite</label>
                        <input type="password" name="code" placeholder="Código">
                    </div>
                    <div class="sub-menu-backtologin" v-show="forgotPass || createAccout">
                        <router-link to="/" @click="createAccout = false, forgotPass = false, button_text='Login'">
                            Voltar para login
                        </router-link>
                    </div>
                    <button class="btn-login" type="button">{{ button_text }}</button>
                    <div class="sub-menu-login" v-show="!forgotPass && !createAccout">
                        Não tem conta ?
                        <router-link to="/" @click="createAccout = true, button_text = 'Criar'">
                            Criar conta
                        </router-link>
                        <br>
                    </div>
                    
                </div>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue"

export default defineComponent({
    data() {
        return {
            createAccout: false,
            forgotPass: false,
            button_text: "Login"
        }
    }
})
</script>

<style scoped>
.main-login {
    width: 100vw;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
}

.left-login {
    width: 50vw;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
}

.left-login > h1 {
    font-size: 2vw;
    margin-bottom: 30px;
    color: #00f6ff;
}

.left-login > h3 {
    color: #9bf6f9;
}

.left-img-login {
    width: 22vw;
    border-radius: 50%;
}

.right-login {
    width: 50vw;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
}

.card-login {
    width: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    padding: 20px 25px;
    background: #1f2531;
    border-radius: 20px;
    box-shadow: 0 10px 30px #00000056;
}

.card-login > h2 {
    color: #00f6ff;
    font-weight: 500;
    margin: 0;
}

.textfield {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-content: flex-start;
    justify-content: center;
    margin: 10px 0px;
}

.textfield > input {
    width: 100%;
    border: none;
    border-radius: 10px;
    padding: 10px;
    background: #293244;
    color: #f0ffffde;
    font-size: 12pt;
    box-shadow: 0 10px 30px #00000056;
    outline: none;
    box-sizing: border-box;
}

.textfield > label {
    color: #f0ffffde;
    margin-bottom: 10px;
}

.textfield > input::placeholder {
    color: #f0ffff94;
}

.textfield > a {
    color: #00f6ff;
    align-self: start;
    margin-top: 10px;
}

.textfield > p {
    color: #f0ffffde;
    margin: 5px 5px;
}

.btn-login {
    width: 100%;
    padding: 16px 0;
    margin: 25px;
    border: none;
    border-radius: 8px;
    outline: none;
    text-transform: uppercase;
    font-weight: 700;
    letter-spacing: 1px;
    color: #1a1f27;
    background: #00f6ff;
    box-shadow: 0 10px 30px -12px #00f6ff;
}

.sub-menu-login {
    color: #f0ffffde;
}

.sub-menu-login > a {
    color: #00f6ff;
}

.sub-menu-backtologin {
    width: 100%;
    display: flex;
    align-content: center;
    justify-content: flex-start;
}

.sub-menu-backtologin > a {
    color: #f0ffffde;
}

@media only screen and (max-width: 950px) {
    .card-login{
        width: 85%;
    }
}

@media only screen and (max-width: 768px) {
    .main-login{
        flex-direction: column;
    }
    .left-login > h1{
        display: none;
    }
    .left-login {
        width: 100%;
        height: auto;
    }

    .right-login {
        width: 100%;
        height: auto;
    }

    .left-img-login {
        width: 50vw;
        margin-bottom: 20px;
    }
}
</style>