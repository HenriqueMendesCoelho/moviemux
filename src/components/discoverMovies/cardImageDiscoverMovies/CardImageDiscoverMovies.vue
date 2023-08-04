<template>
  <CardImage :class="`${selected && 'img-movie-selected'}`" :src="getUrl()" @click="clickOnCard" :animate="!selected && !loading">
    <div class="absolute-bottom hover-show-img text-center" v-if="!selected && !loading">
      {{ props.movie?.title }}<br />
      {{ getMovieDateLocale() }}
    </div>
    <div class="absolute-top-left" style="background: none" v-if="isInAnyWishlist()">
      <div>
        <q-icon name="playlist_add_check" color="white" size="sm" />
        <CustomTooltip :delay="1000">Já está em uma lista</CustomTooltip>
      </div>
    </div>
    <q-btn
      class="absolute all-pointer-events cursor-pointer"
      icon="more_horiz"
      color="grey-mid2"
      style="top: 8px; right: 8px"
      size="sm"
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
          <q-separator dark />
          <q-item clickable v-if="wishlists?.length">
            <q-item-section side>
              <q-icon name="playlist_add" color="white" />
            </q-item-section>
            <q-item-section class="q-pl-sm">Adicionar a minha lista</q-item-section>
            <q-item-section side>
              <q-icon name="keyboard_arrow_right" color="white" />
            </q-item-section>

            <q-menu anchor="top end" self="top start" class="bg-grey-dark2" dark>
              <q-list>
                <q-item v-for="list in wishlists" :key="list.name" clickable :disable="disableList(list)">
                  <q-item-section @click="addMovieToWishlist(list.id, props.movie?.id)" v-close-popup class="q-pl-sm">{{
                    list.name
                  }}</q-item-section>
                  <CustomTooltip v-if="disableList(list)" :delay="500">Filme já adicionado nessa lista</CustomTooltip>
                </q-item>
              </q-list>
            </q-menu>
          </q-item>
        </q-list>
      </q-menu>
    </q-btn>
    <ContextMenuDiscover :movie-id="props.movie.id" @copy-url="emit('copy-url', $event)" />
    <q-inner-loading :showing="loading" label="Aguarde..." color="kb-primary" label-class="text-white" dark />
  </CardImage>
</template>
<script setup lang="ts">
import { onActivated, onMounted, ref, watch } from 'vue';
import { useQuasar } from 'quasar';

import { MovieResultResponseTmdb } from 'src/types/movie/MovieType';
import CardImage from 'src/components/shared/cardImage/CardImage.vue';
import ContextMenuDiscover from './contextMenuDiscover/ContextMenuDiscover.vue';
import CustomTooltip from 'src/components/shared/customTooltip/CustomTooltip.vue';

import WishlistService from 'src/services/WishlistService';
import { WishlistType } from 'src/types/wishlist/WishlistType';

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

function showSuccess(msg: string) {
  $q.notify({
    type: 'positive',
    message: msg,
    position: 'top',
  });
}
function showError(msg: string) {
  $q.notify({
    type: 'negative',
    message: msg,
    position: 'top',
  });
}

function getUrl() {
  return `https://image.tmdb.org/t/p/w500${props.movie?.poster_path}`;
}

function getMovieDateLocale() {
  if (!props.movie?.release_date) {
    return;
  }
  const date = new Date(props.movie.release_date);
  return date.toLocaleString('pt-Br', {
    dateStyle: 'long',
  });
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
    const res = await WishlistService.addMovieToWishlist(wishlistId, tmdbId);
    mergeResult(wishlistId, res);
    showSuccess('Filme adicionado a lista com sucesso');
  } catch (error) {
    showError('Erro ao adicionar filme na lista');
  } finally {
    loading.value = false;
  }
  return;
}
function mergeResult(wishlistId: string, newWishlist: WishlistType) {
  const wishlist = wishlists.value.find((w) => w.id === wishlistId);

  if (!wishlist) {
    return;
  }

  const index = wishlists.value.indexOf(wishlist);
  wishlists.value[index] = newWishlist;
}
function disableList(list: WishlistType) {
  return list.movies_wishlists?.some((m) => m.tmdb_id === props.movie.id);
}
function isInAnyWishlist() {
  return wishlists.value.some((w) => w.movies_wishlists.some((m) => m.tmdb_id === props.movie.id));
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
</style>
