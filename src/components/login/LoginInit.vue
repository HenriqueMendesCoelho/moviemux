<template>
    <div class="main-login">
        <div class="left-login">
            <h1>Bem-vindo ao cineminha Kronus Boss</h1>
            <img src="../../assets/logo-kronus.png" class="left-img-login" alt="logo" />
        </div>
        <div class="right-login">
            <div class="card-login">
                <h2>Login</h2>
                <div class="textfield">
                    <label for="user">E-mail</label>
                    <input type="text" name="email" placeholder="E-mail">
                </div>
                <div class="textfield">
                    <label for="password">Senha</label>
                    <input type="password" name="senha" placeholder="Senha">
                </div>
                <button class="btn-login">Login</button>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue"

export default defineComponent({

})
</script>

<style scoped>
.main-login {
    width: 100vw;
    height: 100vh;
    background-color: #0b0e14;
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
    width: 60%;
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