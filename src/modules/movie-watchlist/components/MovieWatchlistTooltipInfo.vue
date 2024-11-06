<template>
  <BaseTooltip class="q-pa-none q-ma-none" :delay="1200" :hide-delay="300" style="border-radius: 15px">
    <q-list bordered dark style="border-radius: 15px">
      <q-item>
        <q-item-section side>
          <q-icon color="white" name="fa-solid fa-crown" />
        </q-item-section>
        <q-item-section>Cadastrado por:</q-item-section>
        <q-item-section side class="text-white">{{ props.watchlist?.user.name }}</q-item-section>
      </q-item>
      <q-separator dark />
      <q-item>
        <q-item-section side>
          <q-icon color="white" name="fa-solid fa-film" />
        </q-item-section>
        <q-item-section>Qtd. Filmes:</q-item-section>
        <q-item-section side class="text-white">{{ watchlist?.movies_wishlists?.length || 0 }}/100</q-item-section>
      </q-item>
      <q-separator dark />
      <q-item>
        <q-item-section side>
          <q-icon color="white" name="event" />
        </q-item-section>
        <q-item-section>Criada em:</q-item-section>
        <q-item-section side class="text-white">{{ DateUtils.toLocaleString(watchlist?.created_at) }}</q-item-section>
      </q-item>
      <q-separator dark />
      <q-item>
        <q-item-section side>
          <q-icon color="white" name="event" />
        </q-item-section>
        <q-item-section>Atualizada em:</q-item-section>
        <q-item-section side class="text-white">{{ DateUtils.toLocaleString(watchlist?.updated_at) }}</q-item-section>
      </q-item>
    </q-list>
  </BaseTooltip>
</template>
<script setup lang="ts">
import { WatchlistType } from 'src/core/types/movie-watchlist/WatchlistTyoe';

import BaseTooltip from 'src/core/components/BaseTooltip.vue';

import DateUtils from 'src/core/utils/DateUtils';

interface Props {
  watchlist: WatchlistType;
}
const props = defineProps<Props>();
</script>
