<template>
  <div class="col-md-12 col-lg-10 col-xl-9 row q-col-gutter-md q-py-md">
    <div class="text-title-responsive-2 text-white">Minhas Listas ({{ wishlists?.length ? wishlists.length : 0 }}/10)</div>
    <BtnCreateWishlist @ok="listWishlist()" />
    <div class="col-12 row q-col-gutter-md" v-if="wishlists?.length">
      <router-link
        class="col-xs-12 col-sm-6 col-md-4 col-lg-3 text-white row text-decoration-none"
        :to="{ name: 'wishlist', params: { id: list?.id } }"
        v-for="list in wishlists"
        :key="list.name"
      >
        <WishlistCard
          class="col"
          :wishlist="list"
          @click-on-card="emit('clickOnCard', list)"
          @copy-url="copyWishlistUrl(list.id)"
          @delete="openDialogConfirm(list)"
        />
      </router-link>
    </div>
    <div class="col-12 row justify-center" v-else>
      <div class="text-h4 text-white q-mt-md">Você ainda não tem nenhuma lista criada...</div>
    </div>
    <BaseConfirmDialog ref="confirmDialogRef" @ok="deleteWishlist()" @cancel="wishlistToDelete = ''" />
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';

import type { WishlistType } from 'src/core/types/wishlist/WishlistType';

import WishlistCard from './wishlistCard/WishlistCard.vue';
import BtnCreateWishlist from './btnCreateWishlist/BtnCreateWishlist.vue';
import BaseConfirmDialog from 'src/core/components/BaseConfirmDialog.vue';

import WishlistService from 'src/services/WishlistService';
import { hideLoading, showLoading } from 'src/utils/LoadingUtils';
import { showError, showSuccess } from 'src/utils/NotificationUtils';

const wishlists = ref<WishlistType[]>([]);
const confirmDialogRef = ref<InstanceType<typeof BaseConfirmDialog>>();
const wishlistToDelete = ref<string>('');

const emit = defineEmits<{
  (e: 'clickOnCard', value: WishlistType): void;
  (e: 'wishlists', value: WishlistType[]): void;
}>();

onMounted(async () => {
  await listWishlist();
});

async function listWishlist() {
  try {
    showLoading();
    const res = await WishlistService.listWishlists();
    wishlists.value = res;
    emit('wishlists', res);
  } catch {
    showError('Erro ao listar suas listas');
  } finally {
    hideLoading();
  }
}
function copyWishlistUrl(id?: string) {
  if (!id) {
    return;
  }

  const url = `${window.location.origin}/movie/wishlist/${id}`;
  navigator.clipboard.writeText(url);
  showSuccess('URL copiada');
  return url ? url : '';
}
function openDialogConfirm(wishlist: WishlistType) {
  wishlistToDelete.value = wishlist.id;
  confirmDialogRef.value?.show({
    message: `Tem certeza que deseja deletar '${wishlist.name}'? Caso delete não há como desfazer a ação.`,
    focus: 'cancel',
    title: 'Quer mesmo deletar?',
    ok: 'Sim',
  });
}
async function deleteWishlist() {
  if (!wishlistToDelete.value) {
    return;
  }

  try {
    showLoading();
    await WishlistService.deleteWishlist(wishlistToDelete.value);
    await listWishlist();
    showSuccess('Lista deletada com sucesso');
  } catch {
    showError('Erro ao listar suas listas');
  } finally {
    hideLoading();
  }
}
</script>

<style lang="scss" scoped>
.text-decoration-none {
  text-decoration: none;
}
</style>
