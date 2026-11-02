<template>
  <div class="mm-person-portrait">
    <img
      v-if="src && !failed"
      :src="src"
      :alt="name"
      loading="lazy"
      width="185"
      height="278"
      @error="failed = true"
    />
    <div
      v-else
      class="mm-person-silhouette"
      role="img"
      :aria-label="`Retrato indisponível: ${name}`"
    >
      <svg aria-hidden="true" viewBox="0 0 120 160" fill="none">
        <circle cx="60" cy="57" r="24" fill="currentColor" />
        <path d="M18 139c0-29 16-47 42-47s42 18 42 47v21H18z" fill="currentColor" />
      </svg>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue';
const props = defineProps<{ src?: string; name: string }>();
const failed = ref(false);
watch(
  () => props.src,
  () => {
    failed.value = false;
  },
);
</script>
<style scoped>
.mm-person-portrait {
  width: 100%;
  aspect-ratio: 2/3;
  border-radius: 12px;
  overflow: hidden;
  background: var(--mm-raised);
}
.mm-person-portrait img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.mm-person-silhouette {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  background: linear-gradient(145deg, var(--mm-raised), var(--mm-surface));
  color: var(--mm-muted);
}
.mm-person-silhouette svg {
  width: 80%;
  height: 90%;
  opacity: 0.5;
  align-self: end;
}
</style>
