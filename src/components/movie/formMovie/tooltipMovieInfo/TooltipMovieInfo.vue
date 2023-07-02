<template>
  <CustomTooltip class="q-pa-none q-ma-none" :delay="1200" :hide-delay="300" style="border-radius: 15px">
    <q-list bordered dark style="border-radius: 15px; min-width: 15vw">
      <q-item>
        <q-item-section avatar>
          <q-icon color="white" name="fa-solid fa-crown" />
        </q-item-section>
        <q-item-section>Cadastrado por:</q-item-section>
        <q-item-section>{{ movie.user_name }}</q-item-section>
      </q-item>
      <q-separator dark />
      <q-item>
        <q-item-section avatar>
          <q-icon color="white" name="event" />
        </q-item-section>
        <q-item-section>Criado em:</q-item-section>
        <q-item-section>{{ getCreatedAt() }}</q-item-section>
      </q-item>
      <q-separator dark />
      <q-item>
        <q-item-section avatar>
          <q-icon color="white" name="event" />
        </q-item-section>
        <q-item-section>Atualizado em:</q-item-section>
        <q-item-section>{{ getUpdatedAt() }}</q-item-section>
      </q-item>
    </q-list>
  </CustomTooltip>
</template>
<script lang="ts" setup>
import { useMovieStore } from 'src/stores/MovieStore';
import { computed } from 'vue';

import CustomTooltip from 'src/components/shared/customTooltip/CustomTooltip.vue';

const movieStore = useMovieStore();

const movie = computed(() => movieStore.moviePage.selectedMovie);

function getCreatedAt() {
  if (!movie.value.created_at) {
    return 'Erro ao carregar';
  }

  return new Date(movie.value.created_at).toLocaleString();
}

function getUpdatedAt() {
  if (!movie.value.updated_at) {
    return 'Erro ao carregar';
  }

  return new Date(movie.value.updated_at).toLocaleString();
}
</script>
