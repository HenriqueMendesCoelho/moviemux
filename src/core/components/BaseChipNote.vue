<template>
  <q-chip square :color="getChipColor()[0]" text-color="white" :icon-right="getChipColor()[1]">
    {{ getNoteAverage().toFixed(1) }}
  </q-chip>
</template>
<script setup lang="ts">
import type Movie from 'src/core/domain/movie/movie';

const props = defineProps<{
  movie: Movie;
}>();

function getNoteAverage() {
  if (!props.movie?.notes?.length) {
    return 0;
  }
  let sum = 0;
  let count = 0;
  for (const note of props.movie.notes) {
    sum += note.note;
    count++;
  }
  const average = sum / count;
  return average;
}

function getChipColor() {
  const averageNote = getNoteAverage();

  if (averageNote === null || averageNote === undefined) {
    return ['grey', 'sym_o_star', 'white'];
  }

  if (averageNote <= 5) {
    return ['negative', 'sym_o_star'];
  }

  if (averageNote > 5 && averageNote <= 7) {
    return ['orange', 'star_half'];
  }

  if (averageNote > 7 && averageNote <= 9.5) {
    return ['positive', 'star'];
  }

  if (averageNote > 9.5) {
    return ['kb-primary', 'hotel_class'];
  }

  return ['grey', 'sym_o_star'];
}
</script>
