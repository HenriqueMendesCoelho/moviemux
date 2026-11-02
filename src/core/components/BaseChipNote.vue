<template>
  <span class="mm-rating" :class="tone" :aria-label="`Nota média ${average.toFixed(1)}`"
    >★ {{ average.toFixed(1) }}</span
  >
</template>
<script setup lang="ts">
import { computed } from 'vue';
import type Movie from 'src/core/domain/movie/movie';
import { ratingTone } from 'src/core/utils/RatingUtils';
const props = defineProps<{ movie: Movie }>();
const average = computed(() => {
  const ratings = (props.movie.notes || [])
    .map((note) => note.note)
    .filter((note): note is number => typeof note === 'number' && Number.isFinite(note));
  return ratings.length ? ratings.reduce((sum, note) => sum + note, 0) / ratings.length : 0;
});
const tone = computed(() => `mm-rating-${ratingTone(average.value)}`);
</script>
<style scoped>
.mm-rating {
  display: inline-flex;
  gap: 6px;
  padding: 5px 9px;
  border-radius: 8px;
  background: #282d39;
  color: #ffc66d;
  font-weight: 700;
  font-size: 0.85rem;
}
.mm-rating-perfect {
  color: #00f6ff;
}
.mm-rating-good {
  color: #86efac;
}
.mm-rating-low {
  color: #fca5a5;
}
</style>
