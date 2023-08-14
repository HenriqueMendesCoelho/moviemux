<template>
  <ContainerMain>
    <div class="row full-width justify-center">
      <WishlistPageTitle :wishlist="wishlist" />
      <SeparatorDivLineSolid class="q-mb-xl" />
      <MyWishlists v-if="tab === 'myWishlistsTab'" @click-on-card="changeTabToWishlist($event)" @wishlists="wishlists = $event" />
      <WishlistTab
        v-else-if="tab === 'wishlistTab'"
        v-model:wishlist="wishlist"
        @back="back()"
        :id-param="idParam"
        :wishlists="wishlists"
      />
    </div>
  </ContainerMain>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { WishlistType } from 'src/types/wishlist/WishlistType';

import ContainerMain from '../shared/containerMain/ContainerMain.vue';
import SeparatorDivLineSolid from '../shared/separator/SeparatorDivLineSolid.vue';
import MyWishlists from './myWishlistsTab/MyWishlistsTab.vue';
import WishlistTab from './wishlistTab/WishlistTab.vue';
import WishlistPageTitle from './wishlistPageTitle/WishlistPageTitle.vue';

const route = useRoute();
const router = useRouter();
const idParam = computed(() => route.query.id?.toString() || '');

const tab = ref('myWishlistsTab');
const wishlist = ref<WishlistType>();
const wishlists = ref<WishlistType[]>([]);

onMounted(() => {
  document.title = 'Cineminha - Lista de Filmes';
  getIdParam();
});

function changeTabToWishlist(list: WishlistType) {
  if (!list) {
    return;
  }

  wishlist.value = list;
  changeTab('wishlistTab');
}
function changeTab(_tab: 'myWishlistsTab' | 'wishlistTab') {
  tab.value = _tab;
}
function back() {
  if (idParam.value) {
    router.push({ name: 'wishlist' });
  }
  wishlist.value = undefined;
  changeTab('myWishlistsTab');
}
function getIdParam() {
  if (idParam.value) {
    changeTab('wishlistTab');
  }
}
</script>
