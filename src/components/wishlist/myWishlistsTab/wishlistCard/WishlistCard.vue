<template>
  <q-card dark bordered flat class="bg-grey-mid cursor-pointer" @click="emit('clickOnCard')">
    <q-list>
      <q-item dark>
        <q-item-section side>
          <q-icon name="list" color="white" />
        </q-item-section>
        <q-item-section>
          <q-item-label class="text-subtitle1">{{ wishlist.name }}</q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-btn icon="link" color="white" size="md" flat round @click.stop="emit('copy-url')" />
        </q-item-section>
        <q-item-section side>
          <q-btn icon="delete" color="white" size="md" flat round @click.stop="emit('delete')" />
        </q-item-section>
      </q-item>
      <q-separator dark />
      <q-item dark>
        <q-item-section side>
          <q-icon name="public" color="white" />
        </q-item-section>
        <q-item-section>
          <q-item-label>Pública</q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-item-label>{{ wishlist.shareable ? 'Sim' : 'Não' }}</q-item-label>
        </q-item-section>
      </q-item>
      <q-item dark>
        <q-item-section side>
          <q-icon name="fa-solid fa-film" color="white" />
        </q-item-section>
        <q-item-section>
          <q-item-label>Qtd. Filmes</q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-item-label>{{ wishlist.movies_wishlists?.length ? wishlist.movies_wishlists?.length : 0 }}/100</q-item-label>
        </q-item-section>
      </q-item>
      <q-item dark>
        <q-item-section side>
          <q-icon name="event" color="white" />
        </q-item-section>
        <q-item-section>
          <q-item-label>Criada em</q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-item-label>{{ stringUtils.dateToLocaleString(props.wishlist.created_at) }}</q-item-label>
        </q-item-section>
      </q-item>
      <q-item dark>
        <q-item-section side>
          <q-icon name="event" color="white" />
        </q-item-section>
        <q-item-section>
          <q-item-label>Última atualização</q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-item-label>{{ stringUtils.dateToLocaleString(props.wishlist.updated_at) }}</q-item-label>
        </q-item-section>
      </q-item>
    </q-list>
    <ContextMenuWishlistCard @delete="emit('delete')" @copy-url="emit('copy-url')" />
  </q-card>
</template>
<script setup lang="ts">
import type { WishlistType } from 'src/types/wishlist/WishlistType';

import stringUtils from 'src/utils/stringUtils';

import ContextMenuWishlistCard from './contextMenuWishlistCard/ContextMenuWishlistCard,.vue';

interface Props {
  wishlist: WishlistType;
}

const emit = defineEmits<{
  (e: 'clickOnCard', value: void): void;
  (e: 'delete', value: void): void;
  (e: 'copy-url', value: void): void;
}>();

const props = defineProps<Props>();
</script>
