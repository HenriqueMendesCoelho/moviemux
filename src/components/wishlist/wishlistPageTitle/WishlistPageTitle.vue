<template>
  <BasePageTitle :title="wishlist ? wishlist.name : 'Lista de Filmes'" icon="list">
    <template #title>
      <q-popup-edit
        v-if="_wishlist?.user.id === userId"
        class="bg-grey-mid2"
        :model-value="_wishlist.name"
        @save="updateNameWishlist($event)"
        title="Atualizar Nome"
        buttons
        v-slot="scope"
        color="kb-primary"
        dark
        label-set="Salvar"
        :validate="(val) => !!val && val.length >= 3 && val.length <= 30"
      >
        <q-input ref="inputNoteRef" color="kb-primary" dark v-model="scope.value" dense autofocus :rules="[(val) => ruleInput(val)]" />
      </q-popup-edit>
      <BaseTooltip :delay="200" v-if="_wishlist?.user.id === userId">Clique para editar</BaseTooltip>
    </template>
    <template #after-icon v-if="wishlist">
      <TooltipWishlistInfo :wishlist="wishlist" />
    </template>
  </BasePageTitle>
</template>
<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';

import { WishlistType } from 'src/types/wishlist/WishlistType';

import BasePageTitle from 'src/core/components/BasePageTitle.vue';
import BaseTooltip from 'src/core/components/BaseTooltip.vue';
import TooltipWishlistInfo from './tooltipWishlistInfo/TooltipWishlistInfo.vue';

import { useUserStore } from 'src/core/stores/UserStore';
import WishlistService from 'src/services/WishlistService';

interface Props {
  wishlist?: WishlistType;
}
const props = defineProps<Props>();

const userStore = useUserStore();
const userId = userStore.user.id;

const _wishlist = ref<WishlistType>();

onMounted(() => {
  if (!props?.wishlist) {
    return;
  }
  _wishlist.value = props.wishlist;
});

watch(
  () => props.wishlist,
  () => {
    _wishlist.value = props.wishlist;
  }
);

async function updateNameWishlist(wishlistName: string) {
  if (!_wishlist.value) {
    return;
  }

  _wishlist.value.name = wishlistName;

  try {
    await WishlistService.updateWishlist(_wishlist.value);
  } catch {}
}
function ruleInput(val: string): boolean | string {
  return (!!val && val.length >= 3 && val.length <= 30) || 'Deve ter no mínimo 3 caracteres e no máximo 30';
}
</script>
