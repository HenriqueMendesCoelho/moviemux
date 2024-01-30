<template>
  <main class="flex flex-center">
    <div class="row justify-center">
      <div>
        <router-link to="/">
          <img src="/src/assets/logo-kronus.png" class="left-img-login" alt="logo" draggable="false" />
        </router-link>
      </div>
      <div class="col-12"></div>
      <p>404,</p>
      <div class="col-12"></div>
      <h1>página não encontrada...</h1>
    </div>
  </main>
</template>

<script lang="ts" setup></script>

<style lang="scss" scoped>
main {
  height: 100vh;
  h1 {
    color: white;
  }

  p {
    font-size: 35vh;
    color: white;
  }

  a {
    text-decoration: none;
  }

  .left-img-login {
    width: 12vw;
    border-radius: 50%;

    cursor: pointer;

    &:hover {
      box-shadow: 0px 0px 30px -12px var(--primary);

      transition: 0.2s ease-in-out;
    }
  }
}
</style>
