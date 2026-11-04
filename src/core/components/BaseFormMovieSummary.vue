<template>
  <section class="mm-summary-stage" :aria-busy="loading">
    <p v-if="loading && !movie" class="mm-sr-only" role="status">Carregando informações do filme…</p>
    <div v-if="loading && movie" class="mm-summary-refresh" role="status">
      Atualizando informações…
    </div>
    <div v-if="loading && !movie" key="loading" class="mm-summary-skeleton" aria-hidden="true">
      <div class="mm-skeleton-poster" />
      <div class="mm-skeleton-copy">
        <i /><i /><i />
        <div class="mm-skeleton-chips"><b /><b /><b /></div>
        <i /><i /><i /><i />
      </div>
    </div>
    <div v-else-if="error && !movie" key="error" class="mm-summary-error" role="alert">
      <BaseIcon name="refresh" />
      <h3>Não foi possível abrir este filme</h3>
      <p>{{ error }} Tente novamente sem sair desta janela.</p>
      <button type="button" class="mm-button mm-button-primary" @click="getMovie">
        Tentar novamente
      </button>
    </div>
    <div
      v-else-if="movie"
      key="content"
      class="mm-movie-summary"
      :class="{ 'mm-summary-updating': loading }"
    >
      <div class="mm-summary-artwork">
        <img
          v-if="movie.url_image"
          class="mm-summary-poster"
          width="280"
          height="420"
          :src="movie.url_image"
          :srcset="tmdbPosterSrcset(imageBase, movie.url_image)"
          sizes="(max-width: 650px) 104px, 280px"
          :alt="`Pôster de ${movie.portuguese_title}`"
        />
        <div v-else class="mm-empty">Pôster indisponível</div>
        <BaseBtnDialogCast :movie-id="movieId" />
      </div>
      <div class="mm-summary-info">
        <p class="mm-eyebrow">INFORMAÇÕES DO FILME</p>
        <h2>{{ movie.portuguese_title || movie.original_title }}</h2>
        <p class="mm-muted">
          {{ movie.original_title
          }}<template v-if="movie.english_title && movie.english_title !== movie.original_title">
            · {{ movie.english_title }}</template
          >
        </p>
        <p class="mm-summary-meta">
          {{ StringUtils.runtimeToText(movie.runtime) }} · {{ releaseDate }} ·
          {{ movie.director }}
        </p>
        <div v-if="matchingRating" class="mm-preview-rating">
          <button
            v-if="!ratingRevealed"
            type="button"
            class="mm-button mm-button-ghost"
            @click="ratingRevealed = true"
          >
            <BaseIcon name="lock" />Revelar nota do TMDB
          </button>
          <p v-else role="status">
            <template v-if="matchingRating.votes === 0">Ainda sem avaliações no TMDB.</template
            ><template v-else
              ><strong>{{ matchingRating.value.toFixed(1) }}</strong> / 10 <span>no TMDB</span
              ><small v-if="matchingRating.votes !== undefined">
                · {{ matchingRating.votes }} avaliações</small
              ></template
            ><button type="button" class="mm-link" @click="ratingRevealed = false">Ocultar</button>
          </p>
        </div>
        <div class="mm-genre-list">
          <span v-for="genre in movie.genres" :key="genre.name" class="mm-chip">{{
            genre.name
          }}</span>
        </div>
        <h3>Sinopse</h3>
        <p class="mm-synopsis">{{ movie.description || 'Sinopse não disponível.' }}</p>
        <div class="mm-actions">
          <a
            v-if="movie.tmdb_id"
            :href="`https://www.themoviedb.org/movie/${movie.tmdb_id}`"
            target="_blank"
            rel="noopener noreferrer"
            class="mm-button mm-button-ghost"
            >TMDB {{ movie.tmdb_id }} <BaseIcon name="arrow" /></a
          ><a
            v-if="movie.imdb_id"
            :href="`https://www.imdb.com/title/${movie.imdb_id}`"
            target="_blank"
            rel="noopener noreferrer"
            class="mm-button mm-button-ghost"
            >IMDb {{ movie.imdb_id }} <BaseIcon name="arrow"
          /></a>
        </div>
        <BaseMovieWatchProviders :tmdb-id="movieId" />
        <section
          v-if="movie.portuguese_url_trailer || movie.english_url_trailer"
          class="mm-trailers"
        >
          <h3>Trailers</h3>
          <iframe
            v-if="movie.portuguese_url_trailer"
            :src="trailer(movie.portuguese_url_trailer)"
            title="Trailer em português"
            allow="
              accelerometer;
              autoplay;
              clipboard-write;
              encrypted-media;
              gyroscope;
              picture-in-picture;
            "
            allowfullscreen
          /><iframe
            v-if="movie.english_url_trailer"
            :src="trailer(movie.english_url_trailer)"
            title="Trailer em inglês"
            allow="
              accelerometer;
              autoplay;
              clipboard-write;
              encrypted-media;
              gyroscope;
              picture-in-picture;
            "
            allowfullscreen
          />
        </section>
      </div>
    </div>
    <p v-if="error && movie" role="alert" class="mm-error">
      {{ error }} <button type="button" class="mm-link" @click="getMovie">Tentar novamente</button>
    </p>
  </section>
</template>
<script setup lang="ts">
import BaseIcon from './BaseIcon.vue';
import { useUserStore } from 'src/core/stores/UserStore';
import { tmdbImageUrl, tmdbPosterSrcset } from 'src/modules/movie/utils/MovieStateUtils';
import { useRuntimeConfig } from '#imports';
const imageBase = String(useRuntimeConfig().public.tmdbImageBase).replace(/\/$/, '');
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import Movie from 'src/core/domain/movie/movie';
import KitService from 'src/core/services/KitService';
import StringUtils from 'src/core/utils/StringUtils';
import BaseBtnDialogCast from './BaseBtnDialogCast.vue';
import BaseMovieWatchProviders from './BaseMovieWatchProviders.vue';
const props = defineProps<{
  movieId: number;
  externalRating?: { movieId: number; value: number; votes?: number };
}>();
const emit = defineEmits<{ error: [] }>();
const userStore = useUserStore();
const ratingRevealed = ref(false);
const matchingRating = computed(() => {
  const rating = props.externalRating;
  return rating &&
    rating.movieId === props.movieId &&
    Number.isFinite(rating.value) &&
    rating.value >= 0 &&
    rating.value <= 10
    ? rating
    : undefined;
});
watch(
  () => [props.movieId, userStore.user.id, userStore.user.generation],
  () => {
    ratingRevealed.value = false;
  },
  { flush: 'sync' },
);
const movie = ref<Movie>(),
  loading = ref(true),
  error = ref('');
let request = 0;
let activeId: number | undefined;
let mounted = true;
const releaseDate = computed(() =>
  movie.value?.release_date
    ? new Date(movie.value.release_date).toLocaleDateString('pt-BR')
    : 'Data não informada',
);
async function getMovie() {
  if (!props.movieId || !mounted || (loading.value && activeId === props.movieId)) return;
  if (activeId !== props.movieId) movie.value = undefined;
  activeId = props.movieId;
  const movieId = props.movieId;
  const id = ++request;
  loading.value = true;
  error.value = '';
  try {
    const res = await KitService.summary({ tmdb_id: movieId });
    // The summary already contains the display names. Do not block film details
    // on another catalogue request just to look up unused genre identifiers.
    const genres = (res.genres || []).map((name, index) => ({ id: index, name }));
    if (id !== request) return;
    movie.value = new Movie(
      '',
      res.tmdb_id,
      res.imdb_id,
      res.portuguese_title,
      res.english_title,
      res.original_title,
      res.director,
      image(res.url_image_portuguese || res.url_image_english),
      res.portuguese_url_trailer,
      res.english_url_trailer,
      res.description,
      genres,
      res.release_date ? new Date(res.release_date) : undefined,
      res.runtime,
    );
  } catch {
    if (id === request) {
      error.value = 'Não foi possível carregar o filme.';
      emit('error');
    }
  } finally {
    if (id === request) loading.value = false;
  }
}
function image(path?: string) {
  return path ? tmdbImageUrl(imageBase, path, 'w500') : undefined;
}
function trailer(value: string) {
  const key = /^[\w-]{11}$/.test(value)
    ? value
    : value.match(/(?:youtu\.be\/|[?&]v=|embed\/)([\w-]{11})/)?.[1];
  return key ? `https://www.youtube-nocookie.com/embed/${key}` : '';
}
onMounted(getMovie);
onBeforeUnmount(() => {
  mounted = false;
  request++;
});
watch(() => props.movieId, getMovie);
defineExpose({ getMovie });
</script>
<style scoped>
.mm-preview-rating {
  margin: 1rem 0;
}
.mm-preview-rating button {
  font-size: 0.8rem;
}
.mm-preview-rating p {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.35rem;
  color: var(--mm-muted);
  font-size: 0.85rem;
}
.mm-preview-rating strong {
  font-size: 1.3rem;
  color: var(--mm-text);
}
.mm-preview-rating .mm-link {
  margin-left: 0.4rem;
}
.mm-summary-stage {
  min-height: 460px;
  position: relative;
}
.mm-movie-summary {
  display: grid;
  grid-template-columns: minmax(180px, 280px) 1fr;
  gap: 32px;
}
.mm-summary-poster {
  width: 100%;
  height: auto;
  aspect-ratio: 2 / 3;
  object-fit: cover;
  border-radius: 18px;
  margin-bottom: 16px;
}
.mm-movie-summary h2 {
  font-size: clamp(1.7rem, 4vw, 2.8rem);
  line-height: 1.1;
  letter-spacing: -0.04em;
  margin: 12px 0;
}
.mm-summary-meta {
  margin: 20px 0;
  opacity: 0.7;
}
.mm-genre-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.mm-chip {
  padding: 6px 10px;
  border: 1px solid var(--grey-mid);
  border-radius: 999px;
  font-size: 0.75rem;
}
.mm-synopsis {
  line-height: 1.7;
  opacity: 0.8;
}
.mm-trailers iframe {
  width: 100%;
  aspect-ratio: 16/9;
  border: 0;
  border-radius: 14px;
  margin-top: 12px;
}
.mm-movie-summary h3 {
  margin: 24px 0 12px;
}
@media (max-width: 650px) {
  .mm-movie-summary {
    grid-template-columns: 104px minmax(0, 1fr);
    gap: 0.75rem 1rem;
  }
  .mm-summary-artwork {
    grid-column: 1;
    grid-row: 1 / 5;
    min-width: 0;
  }
  .mm-summary-info {
    display: contents;
  }
  .mm-summary-info > * {
    grid-column: 1 / -1;
    min-width: 0;
  }
  .mm-summary-info > .mm-eyebrow,
  .mm-summary-info > h2,
  .mm-summary-info > .mm-muted,
  .mm-summary-info > .mm-summary-meta {
    grid-column: 2;
    margin: 0;
  }
  .mm-summary-info > h2 {
    font-size: 1.4rem;
    overflow-wrap: anywhere;
  }
  .mm-summary-info > .mm-muted,
  .mm-summary-info > .mm-summary-meta {
    font-size: 0.78rem;
    line-height: 1.5;
  }
  .mm-summary-poster {
    width: 104px;
    aspect-ratio: 2/3;
    object-fit: cover;
    border-radius: 12px;
    margin: 0 0 0.5rem;
  }
  .mm-summary-artwork :deep(button) {
    width: 100%;
    padding: 0.5rem;
    font-size: 0.72rem;
  }
}
</style>

<style scoped>
.mm-summary-skeleton {
  display: grid;
  grid-template-columns: minmax(180px, 280px) 1fr;
  gap: 32px;
}
.mm-skeleton-poster {
  aspect-ratio: 2/3;
  border-radius: 18px;
  background: var(--mm-raised);
}
.mm-skeleton-copy {
  padding-top: 1rem;
}
.mm-skeleton-copy i,
.mm-skeleton-chips b {
  display: block;
  height: 16px;
  margin: 0 0 1rem;
  border-radius: 7px;
  background: var(--mm-raised);
}
.mm-skeleton-copy i:first-child {
  width: 35%;
  height: 12px;
}
.mm-skeleton-copy i:nth-child(2) {
  width: 85%;
  height: 38px;
}
.mm-skeleton-copy i:nth-child(3) {
  width: 60%;
}
.mm-skeleton-chips {
  display: flex;
  gap: 0.5rem;
  margin: 1.5rem 0 2rem;
}
.mm-skeleton-chips b {
  width: 70px;
  height: 28px;
  border-radius: 20px;
}
.mm-summary-skeleton {
  animation: summary-pulse 1.6s ease-in-out infinite alternate;
}
.mm-summary-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.85rem;
  min-height: 460px;
  text-align: center;
  padding: 2rem;
}
.mm-summary-error h3,
.mm-summary-error p {
  margin: 0;
}
.mm-summary-error p {
  color: var(--mm-muted);
  max-width: 34ch;
  line-height: 1.6;
}
.mm-summary-refresh {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 0.6rem 1rem;
  background: var(--mm-raised);
  color: var(--mm-muted);
  border-radius: 10px;
  font-size: 0.8rem;
  margin-bottom: 1rem;
}
.mm-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
@keyframes summary-pulse {
  from {
    opacity: 0.5;
  }
  to {
    opacity: 1;
  }
}
@media (max-width: 650px) {
  .mm-summary-stage {
    min-height: 420px;
  }
  .mm-summary-skeleton {
    grid-template-columns: 100px 1fr;
    gap: 1rem;
  }
  .mm-skeleton-copy i:nth-child(2) {
    height: 28px;
  }
  .mm-skeleton-chips {
    flex-wrap: wrap;
    margin: 1rem 0;
    gap: 0.25rem;
  }
  .mm-skeleton-chips b {
    width: 45px;
  }
  .mm-summary-error {
    min-height: 420px;
    padding: 1rem;
  }
}
@media (prefers-reduced-motion: reduce) {
  .mm-summary-skeleton {
    animation: none;
  }
}
</style>
