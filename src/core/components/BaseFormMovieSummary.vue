<template>
  <section :aria-busy="loading">
    <p v-if="loading" role="status">Carregando informações do filme…</p>
    <p v-if="error" role="alert" class="mm-error">{{ error }}</p>
    <div v-if="movie && !loading" class="mm-movie-summary">
      <div>
        <img
          v-if="movie.url_image"
          class="mm-summary-poster"
          :src="movie.url_image"
          :srcset="tmdbPosterSrcset(imageBase, movie.url_image)"
          sizes="(max-width: 640px) 180px, 280px"
          :alt="`Pôster de ${movie.portuguese_title}`"
        />
        <div v-else class="mm-empty">Pôster indisponível</div>
        <BaseBtnDialogCast :movie-id="movieId" />
      </div>
      <div>
        <p class="mm-eyebrow">INFORMAÇÕES DO FILME</p>
        <h2>{{ movie.portuguese_title || movie.original_title }}</h2>
        <p class="mm-muted">
          {{ movie.original_title
          }}<template v-if="movie.english_title && movie.english_title !== movie.original_title">
            · {{ movie.english_title }}</template
          >
        </p>
        <p class="mm-summary-meta">
          {{ StringUtils.runtimeToText(movie.runtime) }} · {{ releaseDate }} · {{ movie.director }}
        </p>
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
  </section>
</template>
<script setup lang="ts">
import BaseIcon from './BaseIcon.vue';
import { tmdbImageUrl, tmdbPosterSrcset } from 'src/modules/movie/utils/MovieStateUtils';
import { useRuntimeConfig } from '#imports';
const imageBase = String(useRuntimeConfig().public.tmdbImageBase).replace(/\/$/, '');
import { computed, onMounted, ref, watch } from 'vue';
import Movie from 'src/core/domain/movie/movie';
import KitService from 'src/core/services/KitService';
import MovieService from 'src/modules/movie/services/MovieService';
import StringUtils from 'src/core/utils/StringUtils';
import BaseBtnDialogCast from './BaseBtnDialogCast.vue';
import BaseMovieWatchProviders from './BaseMovieWatchProviders.vue';
const props = defineProps<{ movieId: number }>();
const emit = defineEmits<{ error: [] }>();
const movie = ref<Movie>(),
  loading = ref(false),
  error = ref('');
let request = 0;
const releaseDate = computed(() =>
  movie.value?.release_date
    ? new Date(movie.value.release_date).toLocaleDateString('pt-BR')
    : 'Data não informada',
);
async function getMovie() {
  if (!props.movieId) return;
  const id = ++request;
  loading.value = true;
  error.value = '';
  try {
    const res = await KitService.summary({ tmdb_id: props.movieId });
    let genres: Movie['genres'] = [];
    if (res.genres?.length) {
      try {
        const all = await MovieService.getMoviesGenres();
        genres = all.filter((g) => res.genres.includes(g.name));
      } catch {
        genres = res.genres.map((name, index) => ({ id: index, name, tmdb_id: 0 }));
      }
    }
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
watch(() => props.movieId, getMovie);
defineExpose({ getMovie });
</script>
<style scoped>
.mm-movie-summary {
  display: grid;
  grid-template-columns: minmax(180px, 280px) 1fr;
  gap: 32px;
}
.mm-summary-poster {
  width: 100%;
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
    grid-template-columns: 1fr;
  }
  .mm-summary-poster {
    max-width: 220px;
    display: block;
    margin-inline: auto;
  }
}
</style>
