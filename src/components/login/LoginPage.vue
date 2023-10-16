<template>
  <div class="row items-center justify-center full-height">
    <div class="col-md-6 col-xs-12">
      <div class="row justify-center">
        <h1 class="text-white desktop-only text-h2">Bem-vindo ao Cineminha!</h1>
        <SeparatorDivLineSolid class="q-my-md desktop-only" style="opacity: 60%" />
        <img
          class="left-img-login col-md-auto col-xs-6"
          src="../../assets/logo-kronus.png"
          alt="logo"
          draggable="false"
          @click="tab = 'login'"
        />
        <div class="col-12" />
        <p class="q-mt-xl desktop-only" style="font-size: smaller; color: white">Powered by Kronus Platform</p>
      </div>
    </div>
    <div class="col-md-5 col-xs-12 row justify-center">
      <FormLogin class="col-md-6 col-xs-12 q-pa-xs" v-model="tab" />
    </div>
    <div class="absolute-bottom cursor-pointer desktop-only" @click="openURL('https://www.themoviedb.org/?language=pt-BR')">
      <div class="row justify-center">
        <div class="col-auto">
          <img class="" src="../../assets/tmdb-logo-long.svg" style="height: 20px" />
        </div>
        <div class="col-12"></div>
        <div class="col-auto">
          <p class="q-mt-xs" style="font-size: smaller; color: white">
            This product uses the TMDB API but is not endorsed or certified by TMDB.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { openURL, useMeta } from 'quasar';

import { useUserStore } from 'src/stores/UserStore';

import FormLogin from './formLogin/FormLogin.vue';
import SeparatorDivLineSolid from '../shared/separator/SeparatorDivLineSolid.vue';

import KitService from 'src/services/KitService';

const userStore = useUserStore();
const router = useRouter();
const route = useRoute();

const user = computed(() => userStore.user);

const tab = ref('login');

const movieId = Number(route.query?.from?.toString()?.split('discover?movie=')[1]);
if (movieId) {
  const res = await KitService.info({ tmdb_id: movieId });

  const title = `Cineminha - Descobrir - ${res.title}`;

  useMeta({
    title: title,
    meta: {
      title: { name: 'title', content: title },
      description: { name: 'description', content: res.description },

      ogTitle: { property: 'og:title', content: title },
      ogDescription: { property: 'og:description', content: res.description },
      ogImage: { property: 'og:image', content: getImageUrl(res.url_image) },

      twitterTitle: { property: 'twitter:title', content: title },
      twitterDescription: { property: 'twitter:description', content: res.description },
      twitterImage: { property: 'twitter:image', content: getImageUrl(res.url_image) },
    },
  });
} else {
  const defaultTitle = 'Cineminha - KronusBoss';
  const defaultDescription = 'Descubra o melhor do cinema, classificações e informações sobre filmes.';
  const defaultImage = 'https://img.cine.kronusboss.com/m3AJqU9tUmOpFgTb-VH3RlGd7tp6GD7QngPMqhSc/cine/kb_1200.png';

  useMeta({
    title: defaultTitle,
    meta: {
      title: { name: 'title', content: defaultTitle },
      description: { name: 'description', content: defaultDescription },

      ogTitle: { property: 'og:title', content: defaultTitle },
      ogDescription: { property: 'og:description', content: defaultDescription },
      ogImage: { property: 'og:image', content: defaultImage },

      twitterTitle: { property: 'twitter:title', content: defaultTitle },
      twitterDescription: { property: 'twitter:description', content: defaultDescription },
      twitterImage: { property: 'twitter:image', content: defaultImage },
    },
  });
}

onMounted(() => {
  if (user.value.isLoged) {
    router.push('/home');
  }
});

function getImageUrl(path?: string, size = 'w342') {
  if (!path) {
    return;
  }
  return `${process.env.VUE_APP_TMDB_IMAGE_BASE}/${size}${path}`;
}
</script>

<style lang="scss" scoped>
.left-img-login {
  border-radius: 50%;

  cursor: pointer;

  &:hover {
    box-shadow: 0px 0px 30px -12px var(--primary);
    transition: 0.2s ease-in-out;
  }
}
</style>
