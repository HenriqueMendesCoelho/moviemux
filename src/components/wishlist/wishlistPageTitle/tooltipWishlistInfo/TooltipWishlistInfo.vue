<template>
  <CustomTooltip class="q-pa-none q-ma-none" :delay="1200" :hide-delay="300" style="border-radius: 15px">
    <q-list bordered dark style="border-radius: 15px">
      <q-item>
        <q-item-section side>
          <q-icon color="white" name="fa-solid fa-crown" />
        </q-item-section>
        <q-item-section>Cadastrado por:</q-item-section>
        <q-item-section side class="text-white">{{ props.wishlist?.user.name }}</q-item-section>
      </q-item>
      <q-separator dark />
      <q-item>
        <q-item-section side>
          <q-icon color="white" name="fa-solid fa-film" />
        </q-item-section>
        <q-item-section>Qtd. Filmes:</q-item-section>
        <q-item-section side class="text-white">{{ wishlist?.movies_wishlists?.length || 0 }}/100</q-item-section>
      </q-item>
      <q-separator dark />
      <q-item>
        <q-item-section side>
          <q-icon color="white" name="event" />
        </q-item-section>
        <q-item-section>Criada em:</q-item-section>
        <q-item-section side class="text-white">{{ StringUtils.dateToLocaleString(wishlist?.created_at) }}</q-item-section>
      </q-item>
      <q-separator dark />
      <q-item>
        <q-item-section side>
          <q-icon color="white" name="event" />
        </q-item-section>
        <q-item-section>Atualizada em:</q-item-section>
        <q-item-section side class="text-white">{{ StringUtils.dateToLocaleString(wishlist?.updated_at) }}</q-item-section>
      </q-item>
    </q-list>
  </CustomTooltip>
</template>
<script setup lang="ts">
import { WishlistType } from 'src/types/wishlist/WishlistType';

import CustomTooltip from 'src/components/shared/customTooltip/CustomTooltip.vue';

import StringUtils from 'src/utils/StringUtils';

interface Props {
  wishlist: WishlistType;
}
const props = defineProps<Props>();
</script>
