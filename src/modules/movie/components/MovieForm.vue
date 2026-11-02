<template>
  <section class="mm-movie-editor">
    <aside class="mm-movie-art">
      <img
        v-if="movie.url_image"
        :src="movie.url_image"
        :alt="movie.portuguese_title || movie.original_title || 'Cartaz do filme'"
        class="mm-poster"
      />
      <div v-else class="mm-poster mm-poster-empty">
        Seu próximo filme<br /><span>Importe os detalhes do TMDB ou preencha o formulário.</span>
      </div>
      <MovieContextMenuImage v-if="movie.id && useUserStore().isAdmin" />
      <MovieTooltipInfo v-if="movie.id" />
    </aside>
    <div class="mm-movie-content">
      <template v-if="readonly">
        <p class="mm-eyebrow">
          {{ fullReleaseDate(movie.release_date) }} ·
          {{ StringUtils.runtimeToText(movie.runtime) }}
        </p>
        <h1>{{ movie.portuguese_title || movie.english_title || movie.original_title }}</h1>
        <p class="mm-muted">
          {{ movie.original_title
          }}<span v-if="movie.english_title && movie.english_title !== movie.original_title">
            · {{ movie.english_title }}</span
          >
        </p>
        <div class="mm-genre-tags">
          <span v-for="genre in movie.genres" :key="genre.id" class="mm-badge">{{
            genre.name
          }}</span>
        </div>
        <p class="mm-synopsis">{{ movie.description }}</p>
        <p><span class="mm-muted">Direção</span> {{ movie.director }}</p>
        <div class="mm-movie-links">
          <a
            v-if="movie.tmdb_id"
            :href="`https://www.themoviedb.org/movie/${movie.tmdb_id}`"
            target="_blank"
            rel="noopener noreferrer"
            class="mm-button"
            >TMDB ↗</a
          >
          <a
            v-if="movie.imdb_id"
            :href="`https://www.imdb.com/title/${movie.imdb_id}`"
            target="_blank"
            rel="noopener noreferrer"
            class="mm-button"
            >IMDb ↗</a
          >
        </div>
      </template>
      <form v-else ref="formRef" class="mm-form mm-movie-fields" @submit.prevent>
        <header>
          <p class="mm-eyebrow">Sua coleção, suas histórias</p>
          <h2>Informações do filme</h2>
        </header>
        <label>Título em português<input v-model="movie.portuguese_title" required /></label>
        <label
          >Título em inglês<input
            v-model="movie.english_title"
            :required="movie.original_title !== movie.english_title"
        /></label>
        <label>Título original<input v-model="movie.original_title" /></label>
        <label>Diretor<input v-model="movie.director" required /></label>
        <label
          >Duração em minutos<input
            v-model.number="movie.runtime"
            type="number"
            min="0"
            max="999"
            required
        /></label>
        <label>Data de lançamento<input v-model="releaseDate" type="date" required /></label>
        <label class="mm-span-full"
          >Sinopse<textarea v-model="movie.description" rows="5" required />
        </label>
        <fieldset class="mm-span-full mm-genre-field">
          <legend>Gêneros</legend>
          <p v-if="loadingGenres" role="status">Carregando gêneros…</p>
          <label v-for="genre in moviePage.genres" :key="genre.id"
            ><input v-model="genreIds" type="checkbox" :value="genre.id" /> {{ genre.name }}</label
          >
          <p v-if="validation && !genreIds.length" role="alert">Escolha ao menos um gênero.</p>
        </fieldset>
        <label>TMDB ID<input :value="movie.tmdb_id" readonly /></label>
        <label>IMDb ID<input v-model="movie.imdb_id" /></label>
        <label class="mm-span-full"
          >URL do cartaz<input v-model="movie.url_image" required
        /></label>
        <label
          >Trailer dublado<input
            :value="movie.portuguese_url_trailer"
            placeholder="Link do YouTube ou código do vídeo"
            @change="
              movie.portuguese_url_trailer = videoKey(($event.target as HTMLInputElement).value)
            "
        /></label>
        <label
          >Trailer legendado<input
            :value="movie.english_url_trailer"
            placeholder="Link do YouTube ou código do vídeo"
            @change="
              movie.english_url_trailer = videoKey(($event.target as HTMLInputElement).value)
            "
        /></label>
        <p
          v-if="validation && !movie.portuguese_url_trailer && !movie.english_url_trailer"
          role="alert"
          class="mm-span-full"
        >
          Adicione ao menos um trailer.
        </p>
      </form>
      <div class="mm-movie-links">
        <BaseChipNote
          v-if="movie.show_notes && movie.notes?.length"
          :movie="movie"
        /><BaseDialogCast v-if="movie.tmdb_id" :movie-id="movie.tmdb_id" />
      </div>
      <BaseMovieWatchProviders v-if="movie.tmdb_id" :tmdb-id="movie.tmdb_id" />
    </div>
  </section>
</template>
<script setup lang="ts">
import { useMovieContext } from '../composables/useMovieContext';
import { useMovieRequests } from '../composables/useMovieRequests';
import { dateOnly, fullReleaseDate } from '../utils/MovieStateUtils';
import { computed, onMounted, ref } from 'vue';
import BaseChipNote from 'src/core/components/BaseChipNote.vue';
import BaseMovieWatchProviders from 'src/core/components/BaseMovieWatchProviders.vue';
import BaseDialogCast from 'src/core/components/BaseBtnDialogCast.vue';
import MovieContextMenuImage from './MovieContextMenuImage.vue';
import MovieTooltipInfo from './MovieTooltipInfo.vue';
import { useMovieStore } from '../stores/MovieStore';
import { useUserStore } from 'src/core/stores/UserStore';
import MovieService from '../services/MovieService';
import StringUtils from 'src/core/utils/StringUtils';
import { showError } from 'src/core/utils/NotificationUtils';
defineProps<{ readonly?: boolean }>();
const moviePage = computed(() => useMovieStore().moviePage);
const movie = useMovieContext();
const requests = useMovieRequests();
const loadingGenres = ref(false),
  validation = ref(false);
const formRef = ref<HTMLFormElement>();
const genreIds = computed({
  get: () => movie.value.genres?.map((g) => g.id) || [],
  set: (ids: number[]) => {
    movie.value.genres = moviePage.value.genres.filter((g) => ids.includes(g.id));
  },
});
const releaseDate = computed({
  get: () => dateOnly(movie.value.release_date),
  set: (date: string) => {
    movie.value.release_date = date ? new Date(`${date}T12:00:00`) : undefined;
  },
});
onMounted(async () => {
  const current = requests.begin('genres');
  loadingGenres.value = true;
  try {
    const genres = await MovieService.getMoviesGenres();
    if (current()) moviePage.value.genres = genres;
  } catch {
    if (current()) showError('Não foi possível carregar os gêneros.');
  } finally {
    if (current()) loadingGenres.value = false;
  }
});
function videoKey(value: string) {
  return (
    value
      .split(/(?:vi\/|v=|\/b\/|youtu\.be\/|\/embed\/)/)
      .pop()
      ?.split(/[^0-9a-z_-]/i)[0] || ''
  );
}
async function hasErrors() {
  validation.value = true;
  return (
    !(formRef.value?.reportValidity() ?? true) ||
    !genreIds.value.length ||
    !(movie.value.portuguese_url_trailer || movie.value.english_url_trailer)
  );
}
function resetValidation() {
  validation.value = false;
}
defineExpose({ hasErrors, resetValidation });
</script>
<style scoped>
.mm-movie-editor {
  display: grid;
  grid-template-columns: minmax(180px, 300px) minmax(0, 1fr);
  gap: clamp(1.5rem, 4vw, 4rem);
  align-items: start;
}
.mm-poster {
  width: 100%;
  aspect-ratio: 2/3;
  object-fit: cover;
  border-radius: 20px;
  box-shadow: 0 20px 60px #0004;
}
.mm-poster-empty {
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
  background: var(--grey-mid);
  padding: 2rem;
  font-size: 1.4rem;
}
.mm-poster-empty span {
  font-size: 0.9rem;
  margin-top: 1rem;
  color: var(--light-grey2);
}
.mm-movie-content h1 {
  font-size: clamp(2rem, 4vw, 3.6rem);
  line-height: 1.08;
  margin: 0.6rem 0 1rem;
}
.mm-eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.15em;
  font-size: 0.75rem;
  color: var(--primary);
}
.mm-muted {
  opacity: 0.65;
}
.mm-synopsis {
  font-size: 1.05rem;
  line-height: 1.85;
  margin: 2rem 0;
}
.mm-genre-tags,
.mm-movie-links {
  display: flex;
  gap: 0.7rem;
  flex-wrap: wrap;
  margin: 1rem 0;
}
.mm-badge {
  border: 1px solid #8884;
  border-radius: 30px;
  padding: 0.35rem 0.8rem;
  font-size: 0.8rem;
}
.mm-movie-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
.mm-movie-fields header,
.mm-span-full {
  grid-column: 1/-1;
}
.mm-movie-fields label {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.85rem;
}
.mm-movie-fields input,
.mm-movie-fields textarea {
  padding: 0.8rem;
  border: 1px solid #8885;
  border-radius: 10px;
  background: var(--grey-dark2);
  color: inherit;
  font: inherit;
  width: 100%;
}
.mm-genre-field {
  padding: 1rem;
  border: 1px solid #8884;
  border-radius: 12px;
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}
.mm-genre-field label {
  flex-direction: row;
  align-items: center;
}
.mm-genre-field input {
  width: auto;
}
.mm-movie-content {
  min-width: 0;
}
@media (max-width: 750px) {
  .mm-movie-editor {
    grid-template-columns: 1fr;
  }
  .mm-movie-art {
    max-width: 260px;
    margin: auto;
  }
  .mm-movie-fields {
    grid-template-columns: 1fr;
  }
  .mm-movie-fields > * {
    grid-column: 1;
  }
}
</style>
