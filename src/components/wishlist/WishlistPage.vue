<template>
  <BaseContainerMain>
    <div class="row full-width justify-center">
      <WishlistPageTitle :wishlist="wishlist" />
      <BaseHorizontalSeparator class="q-mb-xl" />
      <MyWishlists v-if="tab === 'myWishlistsTab'" @click-on-card="changeTabToWishlist($event)" @wishlists="wishlists = $event" />
      <WishlistTab
        v-else-if="tab === 'wishlistTab'"
        v-model:wishlist="wishlist"
        @back="back()"
        :id-param="idPathParam"
        :wishlists="wishlists"
      />
    </div>
  </BaseContainerMain>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUpdated, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { WishlistType } from 'src/core/types/wishlist/WishlistType';

import BaseContainerMain from 'src/core/components/BaseContainerMain.vue';
import BaseHorizontalSeparator from 'src/core/components/BaseHorizontalSeparator.vue';
import MyWishlists from './myWishlistsTab/MyWishlistsTab.vue';
import WishlistTab from './wishlistTab/WishlistTab.vue';
import WishlistPageTitle from './wishlistPageTitle/WishlistPageTitle.vue';
import WishlistService from 'src/core/services/WishlistService';

const route = useRoute();
const router = useRouter();
const idPathParam = computed(() => route.params.id?.toString() || '');

const tab = ref('myWishlistsTab');
const wishlist = ref<WishlistType>();
const wishlists = ref<WishlistType[]>([]);

onMounted(async () => {
  document.title = 'Cineminha - Lista de Filmes';
  await getIdParam();
});

onUpdated(async () => {
  await getIdParam();
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
  if (idPathParam.value) {
    router.push({ name: 'wishlist' });
  }
  wishlist.value = undefined;
  changeTab('myWishlistsTab');
}
async function getIdParam() {
  if (!idPathParam.value) {
    return;
  }

  try {
    wishlists.value = await WishlistService.listWishlists();
  } catch {}
  changeTab('wishlistTab');
}
</script>
