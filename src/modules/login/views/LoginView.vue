<template>
  <main class="mm-welcome">
    <section class="mm-welcome-story">
      <router-link to="/" class="mm-brand" aria-label="Movie Mux, início"
        ><img src="../../../assets/logo.webp" alt="Movie Mux" width="120" height="120"
      /></router-link>
      <p class="mm-eyebrow">PARA QUEM VIVE CINEMA</p>
      <h1>Grandes histórias.<br /><span>Seu olhar.</span></h1>
      <p>Descubra seu próximo filme favorito, organize sua lista e compartilhe cada descoberta.</p>
      <div class="mm-welcome-tags">
        <span>Descubra</span><span>Avalie</span><span>Compartilhe</span>
      </div>
      <small>Powered by Kronus Platform</small>
    </section>
    <section class="mm-welcome-form">
      <SpotlightCard class="mm-login-spotlight"><LoginForm v-model="tab" /></SpotlightCard>
    </section>
    <footer class="mm-welcome-footer">
      <NecessaryCookieNotice />
      <TmdbCredits />
    </footer>
  </main>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useAsyncData, useHead, useRoute, useRouter, useRuntimeConfig } from '#imports';
import { useUserStore } from 'src/core/stores/UserStore';
import KitService from 'src/core/services/KitService';
import { safeReturnPath } from '../utils/AccountUtils';
import LoginForm from '../components/LoginForm.vue';
import NecessaryCookieNotice from '../components/NecessaryCookieNotice.vue';
import TmdbCredits from '../components/TmdbCredits.vue';
import SpotlightCard from 'src/core/components/vue-bits/SpotlightCard.vue';
const tab = ref('login');
const route = useRoute();
const router = useRouter();
const store = useUserStore();
const config = useRuntimeConfig();
const sharedMovieId = computed(() => {
  const from = typeof route.query.from === 'string' ? route.query.from : '';
  return Number(from.match(/discover\?movie=(\d+)/)?.[1]) || 0;
});
const { data: movie } = await useAsyncData(
  `login-share-${sharedMovieId.value}`,
  async () => {
    if (!sharedMovieId.value) return null;
    try {
      return await KitService.info({ tmdb_id: sharedMovieId.value });
    } catch {
      return null;
    }
  },
  { watch: [sharedMovieId] },
);
useHead(() => {
  const title = movie.value?.title ? `Movie Mux - Descobrir - ${movie.value.title}` : 'Movie Mux';
  const description =
    movie.value?.description ||
    'Descubra o melhor do cinema, classificações e informações sobre filmes.';
  const image = movie.value?.url_image
    ? `${String(config.public.tmdbImageBase).replace(/\/$/, '')}/w342${movie.value.url_image}`
    : 'https://img.moviemux.com/04VfS86K-_pAcjgaBHKzinmNiUp0gSD3VyuP0wjm/moviemux/MovieMux.webp';
  return {
    title,
    meta: [
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:image', content: image },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: image },
    ],
  };
});
onMounted(async () => {
  if (store.user.isLoged) await router.replace(safeReturnPath(route.query.from));
});
</script>
<style scoped>
.mm-welcome {
  min-height: 100dvh;
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  gap: 3rem;
  align-items: center;
  padding: clamp(1.5rem, 6vw, 7rem);
  background:
    radial-gradient(
      ellipse at 15% 20%,
      color-mix(in srgb, var(--mm-accent, #00f6ff) 14%, transparent),
      transparent 55%
    ),
    var(--mm-bg);
}
.mm-brand {
  display: inline-block;
  letter-spacing: 0.2em;
  font-weight: 900;
  font-size: 1.4rem;
  margin-bottom: 4rem;
  color: inherit;
  text-decoration: none;
}
.mm-brand img {
  display: block;
  width: clamp(90px, 10vw, 120px);
  height: auto;
  border-radius: 50%;
  box-shadow: 0 12px 36px color-mix(in srgb, var(--mm-accent, #00f6ff) 15%, transparent);
}
.mm-welcome-story h1 {
  font-size: clamp(2.5rem, 5vw, 5.8rem);
  line-height: 1.04;
  letter-spacing: -0.055em;
  margin: 1.2rem 0;
}
.mm-welcome-story h1 span {
  color: var(--mm-accent-text, #00f6ff);
}
.mm-welcome-story > p {
  max-width: 32rem;
  line-height: 1.8;
}
.mm-welcome-story small {
  color: var(--mm-muted);
}
.mm-welcome-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  margin: 2rem 0 4rem;
}
.mm-welcome-tags span {
  border: 1px solid var(--mm-border);
  padding: 0.6rem 1rem;
  border-radius: 2rem;
}
.mm-login-spotlight {
  width: 100%;
  max-width: 480px;
}
.mm-welcome-form {
  display: flex;
  justify-content: center;
}
.mm-welcome-footer {
  grid-column: 1 / -1;
  display: grid;
  gap: 1.5rem;
  font-size: 0.8rem;
  color: var(--mm-muted);
}
.mm-welcome-footer img {
  width: 90px;
}
@media (max-width: 800px) {
  .mm-welcome {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
  .mm-brand {
    margin-bottom: 0;
  }
  .mm-brand img {
    width: 90px;
  }
  .mm-welcome-story {
    text-align: center;
  }
  .mm-welcome-story > p,
  .mm-welcome-story h1 {
    display: none;
  }
  .mm-welcome-story small,
  .mm-welcome-tags {
    display: none;
  }
  .mm-welcome-story h1 {
    font-size: 3rem;
  }
}
</style>
