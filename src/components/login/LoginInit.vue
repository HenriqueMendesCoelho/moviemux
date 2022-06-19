<template>
  <div class="main-login">
    <div class="left-login">
      <h1>Bem-vindo ao cineminha!</h1>
      <img
        src="../../assets/logo-kronus.png"
        class="left-img-login"
        alt="logo"
        draggable="false"
        @click="(forgotPass = false), (createAccout = false)"
      />
    </div>
    <div class="right-login">
      <div class="card-login">
        <h2 v-if="!forgotPass && !createAccout">Login</h2>
        <h2 v-else-if="!forgotPass && createAccout">Criar nova conta</h2>
        <h2 v-else-if="forgotPass && !createAccout">Recuperação de senha</h2>
        <h2 v-else>Error</h2>

        <div class="textfield">
          <label for="user">E-mail</label>
          <input
            type="email"
            name="email"
            placeholder="E-mail"
            v-model="input_email"
            autocomplete="username"
            id="email"
          />
          <p v-show="forgotPass">
            Insira seu e-mail para receber uma nova senha
          </p>
        </div>
        <div class="textfield" v-show="!forgotPass">
          <label for="password">Senha</label>
          <input
            v-show="!createAccout"
            type="password"
            name="senha"
            placeholder="Senha"
            v-model="input_pass"
            autocomplete="current-password"
            id="current-password"
          />
          <input
            v-show="createAccout"
            type="password"
            name="senha"
            placeholder="Senha"
            v-model="input_pass"
            autocomplete="new-password"
            id="new-password"
          />
          <button
            class="btn-forgot"
            @click="(forgotPass = true), (button_text = 'Enviar e-mail')"
            v-show="!createAccout"
          >
            Esqueceu sua senha ?
          </button>
        </div>
        <div class="textfield" v-show="!forgotPass && createAccout">
          <label for="code">Código do convite</label>
          <input
            type="password"
            name="code"
            placeholder="Código"
            v-model="input_code"
          />
        </div>
        <div class="sub-menu-backtologin" v-show="forgotPass || createAccout">
          <button
            class="btn-back"
            @click="
              (createAccout = false),
                (forgotPass = false),
                (button_text = 'Login')
            "
          >
            Voltar para login
          </button>
        </div>
        <button class="btn-login" type="button" @click="routeToLogin">
          {{ button_text }}
        </button>
        <div class="sub-menu-login" v-show="!forgotPass && !createAccout">
          Não tem conta ?
          <button
            class="btn-forgot"
            @click="(createAccout = true), (button_text = 'Criar')"
          >
            Criar conta
          </button>
          <br />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "LoginInit",
  data() {
    return {
      createAccout: false,
      forgotPass: false,
      button_text: "Login",
      input_pass: "",
      input_email: "",
      input_code: "",
    };
  },
  methods: {
    routeToLogin() {
      this.$router.push({ name: "home" });
    },
  },
});
</script>

<style lang="scss" scoped>
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

  transition: 0.2s ease-out;

  .left-img-login {
    cursor: pointer;

    &:hover {
      box-shadow: 0px 0px 30px -12px var(--primary);

      transition: 0.2s ease-in-out;
    }
  }
}

.left-login > h1 {
  font-size: 2vw;
  margin-bottom: 30px;
  color: var(--primary);
}

.left-login > h3 {
  color: var(--light-blue);
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
  background: var(--grey-dark2);
  border-radius: 20px;
  box-shadow: 0 10px 30px var(--shadow);
}

.card-login > h2 {
  color: var(--primary);
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
  background: var(--grey-mid);
  color: var(--light-grey2);
  font-size: 12pt;
  box-shadow: 0 10px 30px var(--shadow);
  outline: none;
  box-sizing: border-box;
}

.textfield > label {
  color: var(--light-grey2);
  margin-bottom: 10px;
}

.textfield > input::placeholder {
  color: var(--light-grey);
}

.btn-forgot {
  color: var(--primary);
  align-self: start;
  margin-top: 10px;
  text-decoration: underline;
}

.btn-back {
  color: white;
  align-self: start;
  text-decoration: underline;
}
.textfield > p {
  color: var(--light-grey2);
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
  color: var(--grey-dark);
  background: var(--primary);
  box-shadow: 0 10px 30px -12px var(--primary);

  &:hover {
    background-color: var(--light-blue);
    box-shadow: 0 10px 30px -12px var(--light-blue);

    transition: 0.2s ease-out;
  }
}

.router-link-blue {
  &:hover {
    color: var(--light-blue);

    transition: 0.2s ease-out;
  }
}

.sub-menu-login {
  color: var(--light-grey2);
}

.sub-menu-login > a {
  color: var(--primary);
}

.sub-menu-backtologin {
  width: 100%;
  display: flex;
  align-content: center;
  justify-content: flex-start;
}

.sub-menu-backtologin > a {
  color: var(--light-grey2);
}

@media only screen and (max-width: 950px) {
  .card-login {
    width: 85%;
  }
}

@media only screen and (max-width: 768px) {
  .main-login {
    flex-direction: column;
  }
  .left-login > h1 {
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
