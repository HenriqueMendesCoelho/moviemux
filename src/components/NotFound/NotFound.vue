<template>
  <main class="flex flex-center">
    <div class="row justify-center">
      <p>404,</p>
      <div class="col-12"></div>
      <h1>página não encontrada...</h1>
      <div class="col-12">
        <div class="row justify-center q-mt-xl">
          <router-link to="/"
            ><q-btn
              style="background: #00f6ff"
              text-color="black"
              label="Voltar para o início"
              :disable="false"
              @click="cancel()"
          /></router-link>
        </div>
      </div>
    </div>
  </main>
</template>

<script>
import { defineComponent } from 'vue';
export default defineComponent({
  name: 'NotFound',
  setup() {
    document.title = 'Cineminha - 404';
  },
});
</script>

<style lang="scss">
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
}
</style>
