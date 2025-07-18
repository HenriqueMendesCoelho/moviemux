<template>
  <div class="row items-center justify-center full-height bg-login-animated">
    <div class="col-md-6 col-xs-12">
      <div class="row justify-center">
        <h1 class="text-white desktop-only text-h2">Bem-vindo ao Movie Mux!</h1>
        <BaseHorizontalSeparator class="q-my-md desktop-only" style="opacity: 60%" />
        <img
          class="left-img-login col-md-auto col-xs-6"
          src="../../../assets/logo.webp"
          alt="logo"
          draggable="false"
          @click="tab = 'login'"
        />
        <div class="col-12" />
        <p class="q-mt-xl desktop-only" style="font-size: smaller; color: white">
          Powered by Kronus Platform
        </p>
      </div>
    </div>
    <div class="col-md-6 col-xs-12 row justify-center">
      <LoginForm class="col-xs-12 col-md-8 col-xl-7 col-xxl-5 q-pa-xs" v-model="tab" />
    </div>
    <div
      class="absolute-bottom cursor-pointer desktop-only"
      @click="openURL('https://www.themoviedb.org/?language=pt-BR')"
    >
      <div class="row justify-center">
        <div class="col-auto">
          <img src="../../../assets/tmdb-logo-long.svg" style="height: 20px" />
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
import { useRouter } from 'vue-router';
import { openURL, useMeta } from 'quasar';

import { useUserStore } from 'src/core/stores/UserStore';
import { useMetaTagsStore } from 'src/core/stores/MetaTagsStore';

import LoginForm from '../components/LoginForm.vue';
import BaseHorizontalSeparator from 'src/core/components/BaseHorizontalSeparator.vue';

const userStore = useUserStore();
const router = useRouter();
const user = computed(() => userStore.user);

const tab = ref('login');

const metaTagsStore = useMetaTagsStore();
const movieInfo = metaTagsStore.info;
if (Object.keys(movieInfo)?.length) {
  const title = `Movie Mux - Descobrir - ${metaTagsStore.info.title}`;
  const imgUrl = getImageUrl(metaTagsStore.info.url_image);

  useMeta({
    title: title,
    meta: {
      title: { name: 'title', content: title },
      description: { name: 'description', content: metaTagsStore.info.description },

      ogTitle: { property: 'og:title', content: title },
      ogDescription: { property: 'og:description', content: metaTagsStore.info.description },
      ogImage: { property: 'og:image', content: imgUrl },

      twitterTitle: { property: 'twitter:title', content: title },
      twitterDescription: {
        property: 'twitter:description',
        content: metaTagsStore.info.description,
      },
      twitterImage: { property: 'twitter:image', content: imgUrl },
    },
  });
} else {
  const defaultTitle = 'Movie Mux';
  const defaultDescription =
    'Descubra o melhor do cinema, classificações e informações sobre filmes.';
  const defaultImage =
    'https://img.moviemux.com/04VfS86K-_pAcjgaBHKzinmNiUp0gSD3VyuP0wjm/moviemux/MovieMux.webp';

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

defineOptions({
  async preFetch({ currentRoute }) {
    const userStore = useUserStore();
    userStore.$reset();
    const metaStore = useMetaTagsStore();
    const movieId = Number(currentRoute.query.from?.toString().split('discover?movie=')[1]);
    if (!movieId) {
      return;
    }

    return await metaStore.getMovieInfo(movieId);
  },
});

onMounted(async () => {
  if (user.value.isLoged) {
    await router.push('/home');
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
.col-xxl-5 {
  @media (min-width: 2560px) {
    flex: 0 0 41.66667%;
    max-width: 41.66667%;
  }
}

.bg-login-animated {
  width: 100%;
  height: 100vh;
  height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-size: 300% 300%;
  background-image: linear-gradient(
    -45deg,
    var(--grey-dark) 0%,
    var(--grey-dark) 25%,
    var(--grey-dark) 51%,
    var(--dark-alt) 100%
  );
  -webkit-animation: AnimateBG 20s ease infinite;
  animation: AnimateBG 20s ease infinite;
}

@-webkit-keyframes AnimateBG {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

@keyframes AnimateBG {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}
</style>
