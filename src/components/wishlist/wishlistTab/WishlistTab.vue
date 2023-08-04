<template>
  <div class="row full-width justify-center">
    <SearchToolbar
      class="col-12"
      :input-search="searchText"
      @input-search="searchText = $event"
      @search="firstSearch()"
      @refresh="resetSearch()"
      @input-search-focus="menuIsFocused = $event"
      :show-select="false"
    >
      <template #prepend>
        <div>
          <q-btn icon="arrow_back_ios" flat round @click="emit('back')" />
          <CustomTooltip :delay="500">Voltar para minhas listas</CustomTooltip>
        </div>
      </template>

      <template #append v-if="_wishlist?.user.id === userId">
        <div>
          <q-toggle
            :model-value="shareable"
            @update:model-value="changeShareable"
            size="xl"
            color="kb-primary"
            checked-icon="public"
            unchecked-icon="public_off"
          />
          <CustomTooltip :delay="500">{{ shareable ? 'Lista Pública' : 'Lista Privada' }}</CustomTooltip>
        </div>
      </template>

      <template #input-search>
        <q-menu class="bg-grey-mid text-white" fit no-focus no-refocus no-parent-event v-model="showMenu">
          <q-list dense dark>
            <div v-for="movie in moviesWhenTyping" :key="movie.tmdb_id">
              <q-item bordered clickable v-close-popup>
                <q-item-section v-close-popup class="q-pl-sm" @click="searchFromMenu(movie.title)">{{
                  movie.title || movie.title_english || 'Erro ao carregar título'
                }}</q-item-section>
              </q-item>
              <q-separator dark />
            </div>
          </q-list>
        </q-menu>
      </template>
    </SearchToolbar>

    <div class="row justify-center q-mt-lg">
      <div class="row justify-center q-col-gutter-xl" v-if="moviesFiltered?.length">
        <div class="col-auto" v-for="movie in moviesFiltered" :key="movie.tmdb_id">
          <WishlistCardImage :movie="movie" @click-on-image="openDialogSummary($event)" @remove-movie="removeMovie($event)" />
        </div>
      </div>
      <div class="row justify-center" v-else>
        <div class="text-h3 text-white">Ainda não há filmes nessa lista...</div>
      </div>
    </div>

    <DialogFormMovieSummary v-model="showDialogMovieSummary" :movie-id="movieIdDialog" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';

import type { WishlistType } from 'src/types/wishlist/WishlistType';

import SearchToolbar from 'src/components/shared/searchToolbar/SearchToolbar.vue';
import WishlistCardImage from './wishlistCardImage/WishlistCardImage.vue';
import CustomTooltip from 'src/components/shared/customTooltip/CustomTooltip.vue';
import DialogFormMovieSummary from 'src/components/shared/formMovieSummary/dialogFormMovieSummary/DialogFormMovieSummary.vue';

import { useUserStore } from 'src/stores/UserStore';
import WishlistService from 'src/services/WishlistService';

const $q = useQuasar();
const router = useRouter();

interface Props {
  wishlist?: WishlistType;
  idParam?: string;
}
const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'back', value: void): void;
  (e: 'update:wishlist', value: WishlistType | undefined): void;
}>();

const userStore = useUserStore();
const userId = userStore.user.id;

const searchText = ref('');
const menuIsFocused = ref(false);
const _wishlist = ref<WishlistType>();
const moviesFiltered = ref<WishlistType['movies_wishlists']>();
const moviesWhenTyping = ref<WishlistType['movies_wishlists']>();
const shareable = ref(false);
const showDialogMovieSummary = ref(false);
const movieIdDialog = ref<number>();

const showMenu = computed<boolean>(() => {
  return !!searchText.value && menuIsFocused.value && !!moviesWhenTyping.value?.length;
});

onMounted(async () => {
  if (props?.idParam) {
    await searchWishlistById();
    return;
  }

  _wishlist.value = props?.wishlist;
  moviesFiltered.value = props?.wishlist?.movies_wishlists;
  shareable.value = props?.wishlist?.shareable || false;
});

watch(
  () => searchText.value,
  () => {
    moviesWhenTyping.value = filterMovies();
  }
);

watch(
  () => props.wishlist,
  () => {
    if (!props?.wishlist) {
      return;
    }

    _wishlist.value = props?.wishlist;
    moviesFiltered.value = props?.wishlist?.movies_wishlists;
    shareable.value = props?.wishlist?.shareable || false;
  }
);

watch(
  () => _wishlist.value,
  (val) => {
    emit('update:wishlist', val);
  },
  { deep: true }
);

function showLoading() {
  $q.loading.show({
    spinnerColor: 'kb-primary',
  });
}
function hideLoading() {
  $q.loading.hide();
}
function showError(msg: string) {
  $q.notify({
    type: 'negative',
    message: msg,
    position: 'top',
  });
}

function firstSearch() {
  searchMoviesAction();
}
function resetSearch() {
  searchText.value = '';
  searchMoviesAction();
}
function searchMoviesAction() {
  moviesFiltered.value = filterMovies();
}
function filterMovies() {
  if (!searchText.value) {
    return _wishlist.value?.movies_wishlists;
  }

  return _wishlist.value?.movies_wishlists?.filter(
    (m) => m.title?.includes(searchText.value) || m.title_english.includes(searchText.value)
  );
}
function searchFromMenu(title?: string) {
  searchText.value = title || '';
  searchMoviesAction();
}
async function searchWishlistById() {
  if (!props?.idParam) {
    return;
  }

  try {
    showLoading();
    const res = await WishlistService.searchWishlistById(props.idParam);

    if (!res) {
      showError('Lista não existe ou não é pública');
      router.push('/home');
    }

    _wishlist.value = res;
    moviesFiltered.value = res?.movies_wishlists;
  } catch {
    showError('Erro ao carregar lista de filmes');
    router.push('/home');
  } finally {
    hideLoading();
  }
}
async function changeShareable(val: boolean) {
  if (!_wishlist.value) {
    return;
  }

  shareable.value = val;
  _wishlist.value.shareable = val;
  await updateWishlist(_wishlist.value);
}
async function removeMovie(tmdbId: number) {
  if (!_wishlist.value) {
    return;
  }

  _wishlist.value.movies_wishlists = _wishlist.value?.movies_wishlists.filter((m) => m.tmdb_id !== tmdbId);
  const res = await updateWishlist(_wishlist.value);
  if (!res) {
    return;
  }
  _wishlist.value = res;
  moviesFiltered.value = res.movies_wishlists;
}
async function updateWishlist(wishlist: WishlistType) {
  try {
    showLoading();
    return await WishlistService.updateWishlist(wishlist);
  } catch (error) {
    showError('Erro ao salvar lista de filmes');
  } finally {
    hideLoading();
  }
}
function openDialogSummary(tmdbId: number) {
  if (!tmdbId) {
    return;
  }
  movieIdDialog.value = tmdbId;
  showDialogMovieSummary.value = true;
}
</script>
