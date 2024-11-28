<template>
  <div class="card-discover" :class="`${!selected && !loading && 'animate'}`">
    <router-link :to="`/movie/discover?movie=${movie.id}`">
      <BaseCardImage :class="`${selected && 'img-movie-selected'}`" :src="getUrl()" @click="clickOnCard" :animate="false">
        <div class="absolute-bottom hover-show-img text-center mobile-hide" v-if="!selected && !loading">
          {{ props.movie?.title }}<br />
          {{ DateUtils.toLocaleDateStringLong(props.movie.release_date) }}
        </div>
        <div class="absolute-top-left" style="background: none" v-if="isInAnyWishlist()">
          <div>
            <q-icon name="playlist_add_check" color="white" :size="$q.platform.is.desktop ? 'md' : 'sm'" />
            <BaseTooltip :delay="1000">Já está em uma lista</BaseTooltip>
          </div>
        </div>
        <ContextMenuDiscover :movie-id="props.movie.id" @copy-url="emit('copy-url', $event)" />
        <q-inner-loading :showing="loading" label="Aguarde..." color="kb-primary" label-class="text-white" dark />
      </BaseCardImage>
    </router-link>
    <q-btn
      class="absolute-top-right all-pointer-events cursor-pointer btn-ham animate"
      icon="more_horiz"
      color="grey-mid2"
      style="top: 8px; right: 8px"
      :size="$q.platform.is.desktop ? 'sm' : 'xs'"
      dark
      round
      @click.stop
    >
      <q-menu class="bg-grey-dark2" dark @before-show="selected = true" @before-hide="selected = false">
        <q-list>
          <q-item clickable v-close-popup @click="clickSimilar">
            <q-item-section side>
              <q-icon name="search" color="white" />
            </q-item-section>
            <q-item-section class="q-pl-sm">Ver filmes similares</q-item-section>
          </q-item>

          <q-item clickable v-close-popup @click="clickRecommendations">
            <q-item-section side>
              <q-icon name="search" color="white" />
            </q-item-section>
            <q-item-section class="q-pl-sm">Ver recomendações</q-item-section>
          </q-item>

          <q-separator dark v-if="wishlists?.length" />
          <q-item clickable v-if="wishlists?.length">
            <q-item-section side>
              <q-icon name="playlist_add" color="white" />
            </q-item-section>
            <q-item-section class="q-pl-sm">Adicionar a minha lista</q-item-section>
            <q-item-section side>
              <q-icon name="keyboard_arrow_right" color="white" />
            </q-item-section>
            <MenuAddMovieWishlist @add-movie="addMovieToWishlist($event, movie.id)" :wishlists="wishlists" :movie="movie.id" />
          </q-item>
        </q-list>
      </q-menu>
    </q-btn>
  </div>
</template>
<script setup lang="ts">
import { onActivated, onMounted, ref, watch } from 'vue';
import { useQuasar } from 'quasar';

import type { WishlistType } from 'src/core/types/wishlist/WishlistType';
import type { MovieResultResponseTmdb } from 'src/core/types/movie/MovieType';

import BaseCardImage from 'src/core/components/BaseCardImage.vue';
import ContextMenuDiscover from './contextMenuDiscover/ContextMenuDiscover.vue';
import BaseTooltip from 'src/core/components/BaseTooltip.vue';
import MenuAddMovieWishlist from './menuAddMovieWishlist/MenuAddMovieWishlist.vue';

import DateUtils from 'src/core/utils/DateUtils';

import MovieWatchlistService from 'src/modules/movie-watchlist/services/MovieWatchlistService';
import { showError, showSuccess } from 'src/core/utils/NotificationUtils';

type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType extends readonly (infer ElementType)[] ? ElementType : never;
interface Props {
  movie: ArrayElement<MovieResultResponseTmdb['results']>;
  modelValue: WishlistType[];
}

const emit = defineEmits<{
  (e: 'callTmdb', value: { label: string; value: string }): void;
  (e: 'clickOnImage', value: void): void;
  (e: 'copy-url', value: number): void;
  (e: 'update:model-value', value: WishlistType[]): void;
}>();

const $q = useQuasar();
const props = defineProps<Props>();

const selected = ref(false);
const wishlists = ref<WishlistType[]>([]);
const loading = ref(false);

onMounted(() => {
  wishlists.value = props.modelValue;
});

onActivated(() => {
  wishlists.value = props.modelValue;
});

watch(
  () => props.modelValue,
  (val) => {
    wishlists.value = val;
  },
  { deep: true }
);

watch(
  () => wishlists.value,
  (val) => {
    emit('update:model-value', val);
  },
  { deep: true }
);

function getUrl() {
  return `https://image.tmdb.org/t/p/w342${props.movie?.poster_path}`;
}
function clickRecommendations() {
  emit('callTmdb', {
    label: `Recomendações para ${props.movie.title}`,
    value: 'recommendation',
  });
}
function clickSimilar() {
  emit('callTmdb', {
    label: `Similares a ${props.movie.title}`,
    value: 'similar',
  });
}
async function addMovieToWishlist(wishlistId: string, tmdbId: number) {
  try {
    loading.value = true;
    const res = await MovieWatchlistService.addMovieToWatchlist(wishlistId, tmdbId);
    mergeResult(wishlistId, res);
    showSuccess('Filme adicionado a lista com sucesso');
  } catch {
    showError('Erro ao adicionar filme na lista');
  } finally {
    loading.value = false;
  }
}
function mergeResult(wishlistId: string, newWishlist: WishlistType) {
  const wishlist = wishlists.value.find((w) => w.id === wishlistId);

  if (!wishlist) {
    return;
  }

  const index = wishlists.value.indexOf(wishlist);
  wishlists.value[index] = newWishlist;
}
function isInAnyWishlist() {
  return wishlists.value?.some((w) => w.movies_wishlists?.some((m) => m.tmdb_id === props.movie.id));
}
function clickOnCard() {
  if (loading.value) {
    return;
  }

  emit('clickOnImage');
}
</script>
<style lang="scss" scoped>
.img-movie-selected {
  opacity: 0.7;
  filter: blur(2px);
}
.card-discover {
  transition: 0.2s ease-out;
  position: relative;
  &:hover.animate {
    transform: scale(1.1);
  }
}
</style>
