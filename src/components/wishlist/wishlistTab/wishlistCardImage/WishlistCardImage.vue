<template>
  <BaseCardImage
    :class="`${selected && 'img-movie-selected'}`"
    :src="getUrl()"
    @click="emit('clickOnImage')"
    :animate="!selected && props.animate"
  >
    <div class="absolute-bottom hover-show-img text-center desktop-only" v-if="!selected">
      {{ props.movie?.title }}<br />
      {{ DateUtils.toLocaleDateStringLong(props.movie.release_date) }}
    </div>
    <div class="absolute-top-left" style="background: none" v-if="isInAnyWishlist()">
      <div v-if="showRemoveItem">
        <q-icon name="sym_o_data_alert" color="white" size="md" />
        <BaseTooltip :delay="1000">Filme presente em múltiplas listas</BaseTooltip>
      </div>
      <div v-else>
        <q-icon name="playlist_add_check" color="white" size="md" />
        <BaseTooltip :delay="1000">Já está em uma lista</BaseTooltip>
      </div>
    </div>
    <q-btn
      class="absolute all-pointer-events cursor-pointer"
      icon="more_horiz"
      color="grey-mid2"
      style="top: 8px; right: 8px"
      :size="isDesktop ? 'sm' : 'xs'"
      dark
      round
      @click.stop
      v-if="showRemoveItem || _wishlists?.length"
    >
      <q-menu class="bg-grey-dark2" dark @before-show="selected = true" @before-hide="selected = false">
        <q-list>
          <q-item v-if="showRemoveItem" @click="emit('removeMovie')" clickable v-close-popup>
            <q-item-section side>
              <q-icon name="playlist_remove" color="white" />
            </q-item-section>
            <q-item-section class="q-pl-sm">Remover da lista</q-item-section>
          </q-item>

          <q-separator dark />
          <q-item clickable v-if="_wishlists?.length">
            <q-item-section side>
              <q-icon name="playlist_add" color="white" />
            </q-item-section>
            <q-item-section class="q-pl-sm">Adicionar a outra Lista</q-item-section>
            <q-item-section side>
              <q-icon name="keyboard_arrow_right" color="white" />
            </q-item-section>
            <q-menu anchor="top end" self="top start" class="bg-grey-dark2" dark>
              <q-list>
                <q-item
                  v-for="list in _wishlists"
                  :key="list.name"
                  clickable
                  :disable="disableList(list)"
                  @click="addMovieToWishlist(list.id, props.movie?.tmdb_id)"
                >
                  <q-item-section v-close-popup class="q-pl-sm">{{ list.name }}</q-item-section>
                  <BaseTooltip v-if="disableList(list)" :delay="500">Filme já adicionado nessa lista</BaseTooltip>
                </q-item>
              </q-list>
            </q-menu>
          </q-item>
        </q-list>
      </q-menu>
    </q-btn>
    <ContextMenuWishlistImage @copy-url="emit('copy-url')" />
    <q-inner-loading :showing="loading" label="Aguarde..." color="kb-primary" label-class="text-white" dark />
  </BaseCardImage>
</template>
<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useQuasar } from 'quasar';

import type { WishlistType } from 'src/core/types/wishlist/WishlistType';

import BaseCardImage from 'src/core/components/BaseCardImage.vue';
import BaseTooltip from 'src/core/components/BaseTooltip.vue';
import ContextMenuWishlistImage from './contextMenuWishlistImage/ContextMenuWishlistImage.vue';

import DateUtils from 'src/utils/DateUtils';
import WishlistService from 'src/services/WishlistService';
import { showError, showSuccess } from 'src/utils/NotificationUtils';

type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType extends readonly (infer ElementType)[] ? ElementType : never;
const props = defineProps<{
  movie: ArrayElement<WishlistType['movies_wishlists']>;
  wishlists: WishlistType[];
  showRemoveItem: boolean;
  animate: boolean;
}>();

interface Emits {
  (e: 'clickOnImage', value: void): void;
  (e: 'removeMovie', value: void): void;
  (e: 'copy-url', value: void): void;
}
const emit = defineEmits<Emits>();

const $q = useQuasar();
const isDesktop = $q.platform.is.desktop;

const selected = ref(false);
const loading = ref(false);
const _wishlists = ref<WishlistType[]>([]);

onMounted(() => {
  setWishlists();
});

watch(
  () => props.wishlists,
  () => {
    setWishlists();
  }
);

function getUrl() {
  return `https://image.tmdb.org/t/p/w500${props.movie?.url_image}`;
}
function disableList(list: WishlistType) {
  return list.movies_wishlists?.some((m) => m.tmdb_id === props.movie.tmdb_id);
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
}
function mergeResult(wishlistId: string, newWishlist: WishlistType) {
  const wishlist = _wishlists.value.find((w) => w.id === wishlistId);

  if (!wishlist) {
    return;
  }

  const index = _wishlists.value.indexOf(wishlist);
  _wishlists.value[index] = newWishlist;
}
function isInAnyWishlist() {
  return _wishlists.value?.some((w) => w.movies_wishlists?.some((m) => m.tmdb_id === props.movie.tmdb_id));
}
function setWishlists() {
  if (props.wishlists?.length) {
    _wishlists.value = [...props.wishlists];
  }
}
</script>

<style lang="scss" scoped>
.img-movie-selected {
  opacity: 0.7;
  filter: blur(2px);
}
</style>
