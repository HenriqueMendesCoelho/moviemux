<template>
  <section
    class="mm-movie-editor"
    :class="{ 'mm-editor-no-art': !readonly && !movie.url_image, 'mm-movie-readonly': readonly }"
  >
    <aside class="mm-movie-art">
      <img
        v-if="movie.url_image"
        :src="movie.url_image"
        :srcset="tmdbPosterSrcset(imageBase, movie.url_image)"
        sizes="(max-width: 750px) 120px, 300px"
        :alt="movie.portuguese_title || movie.original_title || t('catalog.movie.poster')"
        class="mm-poster"
      />
      <div v-else class="mm-poster mm-poster-empty">
        {{ t('catalog.movie.yourNextMovie') }}<br /><span>{{
          t('catalog.movie.emptyPosterHelp')
        }}</span>
      </div>
    </aside>
    <div class="mm-movie-content">
      <template v-if="readonly">
        <header class="mm-movie-heading">
          <p class="mm-eyebrow">
            {{ fullReleaseDate(movie.release_date, locale, t('catalog.movie.unknownDate')) }} ·
            {{
              movie.runtime
                ? t(
                    movie.runtime % 60 ? 'catalog.movie.runtimeText' : 'catalog.movie.runtimeHours',
                    { hours: n(Math.floor(movie.runtime / 60)), minutes: n(movie.runtime % 60) },
                  )
                : n(0)
            }}
          </p>
          <h1>{{ movie.portuguese_title || movie.english_title || movie.original_title }}</h1>
          <p class="mm-muted">
            {{ movie.original_title
            }}<span v-if="movie.english_title && movie.english_title !== movie.original_title">
              · {{ movie.english_title }}</span
            >
          </p>
        </header>
        <div class="mm-movie-metadata">
          <MovieContextMenuImage v-if="movie.id && useUserStore().isAdmin" />
          <MovieTooltipInfo v-if="movie.id" />
        </div>
        <div class="mm-genre-tags">
          <span v-for="genre in movie.genres" :key="genre.id" class="mm-badge">{{
            genreLabel(genre)
          }}</span>
        </div>
        <p class="mm-synopsis">{{ movie.description }}</p>
        <p>
          <span class="mm-muted">{{ t('catalog.movie.directing') }}</span> {{ movie.director }}
        </p>
        <div class="mm-movie-links">
          <a
            v-if="movie.tmdb_id"
            :href="`https://www.themoviedb.org/movie/${movie.tmdb_id}`"
            target="_blank"
            rel="noopener noreferrer"
            class="mm-button"
            >TMDB <BaseIcon name="arrow"
          /></a>
          <a
            v-if="movie.imdb_id"
            :href="`https://www.imdb.com/title/${movie.imdb_id}`"
            target="_blank"
            rel="noopener noreferrer"
            class="mm-button"
            >IMDb <BaseIcon name="arrow"
          /></a>
        </div>
      </template>
      <form v-else ref="formRef" class="mm-form mm-movie-fields" @submit.prevent>
        <header>
          <p class="mm-eyebrow">{{ t('catalog.movie.yourStories') }}</p>
          <h2>{{ t('catalog.movie.movieInformation') }}</h2>
          <p class="mm-field-help">
            {{ t('catalog.movie.requiredHelp') }}
          </p>
        </header>
        <label
          >{{ t('catalog.movie.portugueseTitle') }}<input v-model="movie.portuguese_title" required
        /></label>
        <label
          >{{ t('catalog.movie.englishTitle') }}
          {{ movie.original_title !== movie.english_title ? '*' : t('catalog.movie.optional')
          }}<input
            v-model="movie.english_title"
            :required="movie.original_title !== movie.english_title"
        /></label>
        <label
          >{{ t('catalog.movie.originalTitle') }}<input v-model="movie.original_title"
        /></label>
        <label>{{ t('catalog.movie.director') }}<input v-model="movie.director" required /></label>
        <label
          >{{ t('catalog.movie.runtime')
          }}<input v-model.number="movie.runtime" type="number" min="0" max="999" required
        /></label>
        <label
          >{{ t('catalog.movie.releaseDate') }}<input v-model="releaseDate" type="date" required
        /></label>
        <label class="mm-span-full"
          >{{ t('catalog.movie.synopsis')
          }}<textarea v-model="movie.description" rows="5" required />
        </label>
        <div class="mm-span-full">
          <BaseMultiSelect
            v-model="genreIds"
            :options="
              moviePage.genres.map((genre) => ({ value: genre.id, label: genreLabel(genre) }))
            "
            :label="t('catalog.movie.genres')"
            :placeholder="t('catalog.movie.selectGenres')"
            :loading="loadingGenres"
            :error="genresError ? t(genresError) : ''"
            @retry="loadGenres"
          />
          <p v-if="validation && !genreIds.length" role="alert" class="mm-error">
            {{ t('catalog.movie.chooseGenre') }}
          </p>
        </div>
        <label>{{ t('catalog.movie.tmdbId') }}<input :value="movie.tmdb_id" readonly /></label>
        <label>{{ t('catalog.movie.imdbId') }}<input v-model="movie.imdb_id" /></label>
        <label class="mm-span-full"
          >{{ t('catalog.movie.posterUrl') }}<input v-model="movie.url_image" required
        /></label>
        <p class="mm-span-full mm-field-help">
          {{ t('catalog.movie.trailerHelp') }}
        </p>
        <label
          >{{ t('catalog.movie.dubbedTrailer')
          }}<input
            :value="movie.portuguese_url_trailer"
            @change="
              movie.portuguese_url_trailer = videoKey(($event.target as HTMLInputElement).value)
            "
        /></label>
        <label
          >{{ t('catalog.movie.subtitledTrailer')
          }}<input
            :value="movie.english_url_trailer"
            @change="
              movie.english_url_trailer = videoKey(($event.target as HTMLInputElement).value)
            "
        /></label>
        <p
          v-if="validation && !movie.portuguese_url_trailer && !movie.english_url_trailer"
          role="alert"
          class="mm-span-full"
        >
          {{ t('catalog.movie.chooseTrailer') }}
        </p>
      </form>
      <div v-if="!readonly" class="mm-movie-metadata">
        <MovieContextMenuImage v-if="movie.id && useUserStore().isAdmin" />
        <MovieTooltipInfo v-if="movie.id" />
      </div>
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
import { useI18n } from 'vue-i18n';
const { t, locale, n, te } = useI18n();
import { useMovieContext } from '../composables/useMovieContext';
import { useMovieRequests } from '../composables/useMovieRequests';
import { dateOnly, fullReleaseDate, tmdbPosterSrcset } from '../utils/MovieStateUtils';
import { computed, onMounted, ref } from 'vue';
import { useRuntimeConfig } from '#imports';
const imageBase = useRuntimeConfig().public.tmdbImageBase;
import BaseIcon from 'src/core/components/BaseIcon.vue';
import BaseMultiSelect from 'src/core/components/BaseMultiSelect.vue';
import BaseChipNote from 'src/core/components/BaseChipNote.vue';
import BaseMovieWatchProviders from 'src/core/components/BaseMovieWatchProviders.vue';
import BaseDialogCast from 'src/core/components/BaseBtnDialogCast.vue';
import MovieContextMenuImage from './MovieContextMenuImage.vue';
import MovieTooltipInfo from './MovieTooltipInfo.vue';
import { useMovieStore } from '../stores/MovieStore';
import { useUserStore } from 'src/core/stores/UserStore';
import MovieService from '../services/MovieService';
import { showError } from 'src/core/utils/NotificationUtils';
defineProps<{ readonly?: boolean }>();
const moviePage = computed(() => useMovieStore().moviePage);
function genreLabel(genre: { id: number; name: string; tmdb_id?: number }) {
  const tmdbId =
    genre.tmdb_id ?? moviePage.value.genres.find((item) => item.id === genre.id)?.tmdb_id;
  const key = `catalog.genre.${tmdbId}`;
  return tmdbId && te(key) ? t(key) : genre.name;
}

const movie = useMovieContext();
const requests = useMovieRequests();
const genresError = ref('');
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
async function loadGenres() {
  if (loadingGenres.value) return;
  genresError.value = '';
  const current = requests.begin('genres');
  loadingGenres.value = true;
  try {
    const genres = await MovieService.getMoviesGenres();
    if (current()) moviePage.value.genres = genres;
  } catch {
    if (current()) {
      genresError.value = 'catalog.movie.genresError';
      showError(() => t('catalog.movie.genresError'));
    }
  } finally {
    if (current()) loadingGenres.value = false;
  }
}
onMounted(loadGenres);
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
.mm-field-help {
  color: var(--mm-muted);
  font-size: 0.85rem;
  line-height: 1.6;
  margin: 0.4rem 0;
}
.mm-movie-editor.mm-editor-no-art {
  grid-template-columns: 1fr;
}
.mm-editor-no-art .mm-movie-art {
  width: 100%;
  max-width: none;
  margin: 0;
}
.mm-editor-no-art .mm-poster-empty {
  aspect-ratio: auto;
  min-height: 0;
  padding: 1.2rem 1.5rem;
  font-size: 1rem;
  text-align: left;
  border: 1px dashed var(--mm-border);
  background: var(--mm-surface);
  box-shadow: none;
}
.mm-editor-no-art .mm-poster-empty span {
  margin-top: 0.35rem;
  color: var(--mm-muted);
}

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
  color: var(--mm-link);
}
.mm-muted {
  color: var(--mm-muted);
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
  .mm-movie-editor.mm-movie-readonly {
    grid-template-columns: 120px minmax(0, 1fr);
  }
  .mm-movie-readonly .mm-movie-art {
    grid-column: 1;
    grid-row: 1;
  }
  .mm-movie-readonly .mm-movie-content {
    display: contents;
  }
  .mm-movie-readonly .mm-movie-content > * {
    grid-column: 1 / -1;
    min-width: 0;
  }
  .mm-movie-readonly .mm-movie-content > .mm-movie-heading {
    grid-column: 2;
    grid-row: 1;
    overflow-wrap: anywhere;
  }
  .mm-movie-readonly .mm-movie-heading h1 {
    font-size: clamp(1.3rem, 5.5vw, 1.8rem);
    margin-top: 0.4rem;
  }
  .mm-movie-heading .mm-eyebrow {
    font-size: 0.65rem;
    letter-spacing: 0.06em;
  }

  .mm-movie-editor {
    grid-template-columns: 1fr;
  }
  .mm-movie-art {
    max-width: 120px;
    margin: 0;
  }
  .mm-movie-editor {
    gap: 1rem;
    min-width: 0;
  }
  .mm-movie-content h1 {
    font-size: 1.8rem;
  }
  .mm-movie-fields {
    grid-template-columns: 1fr;
  }
  .mm-movie-fields > * {
    grid-column: 1;
  }
}
</style>
