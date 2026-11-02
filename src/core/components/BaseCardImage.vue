<template>
  <div
    class="mm-poster img-movie"
    :class="{ 'mm-poster-animate': animate }"
    :style="{ width, height }"
    @contextmenu="openContextMenu"
  >
    <img
      v-if="src && !failed"
      :src="src"
      :srcset="tmdbPosterSrcset(imageBase, src)"
      :sizes="sizes"
      :alt="alt"
      loading="lazy"
      draggable="false"
      @load="loaded = true"
      @error="failed = true"
    />
    <div v-else class="mm-poster-fallback" role="img" :aria-label="alt || 'Pôster indisponível'">
      🎬<small>Imagem indisponível</small>
    </div>
    <span v-if="!loaded && !failed && src" class="mm-poster-loading" aria-hidden="true" /><slot />
  </div>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRuntimeConfig } from '#imports';
import { tmdbPosterSrcset } from 'src/modules/movie/utils/MovieStateUtils';
const imageBase = useRuntimeConfig().public.tmdbImageBase;
const props = withDefaults(
  defineProps<{
    src?: string;
    alt?: string;
    animate?: boolean;
    width?: string;
    height?: string;
    sizes?: string;
  }>(),
  {
    animate: true,
    alt: 'Pôster do filme',
    sizes: '(max-width: 600px) calc((100vw - 48px) / 2), (max-width: 1100px) 22vw, 200px',
  },
);
function openContextMenu(event: MouseEvent) {
  const host = (event.currentTarget as HTMLElement).closest('article');
  // BaseContextMenu listens on the article and positions its own accessible menu.
  if (host?.querySelector('[data-mm-context-menu]')) return;
  const details = host?.querySelector<HTMLDetailsElement>(
    'details.mm-card-actions, details.mm-discover-actions',
  );
  if (!details) return; // Preserve the browser menu if this card has no actions.
  event.preventDefault();
  details.open = true;
  details.querySelector<HTMLElement>('button:not(:disabled),a[href]')?.focus();
}
const failed = ref(false),
  loaded = ref(false);
watch(
  () => props.src,
  () => {
    failed.value = false;
    loaded.value = false;
  },
);
</script>
<style scoped>
.mm-poster {
  position: relative;
  overflow: hidden;
  border-radius: 16px;
  aspect-ratio: 2/3;
  background: var(--grey-mid);
  width: 100%;
  isolation: isolate;
}
.mm-poster > img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.mm-poster-fallback {
  display: grid;
  place-content: center;
  text-align: center;
  height: 100%;
  gap: 12px;
}
.mm-poster-animate {
  transition: transform 0.2s;
}
.mm-poster-animate:hover {
  transform: translateY(-4px);
}
.mm-poster-loading {
  position: absolute;
  inset: 0;
  background: linear-gradient(110deg, transparent, #ffffff12, transparent);
  pointer-events: none;
}
.img-movie :deep(.hover-show-img) {
  opacity: 0;
}
.img-movie:hover :deep(.hover-show-img),
.img-movie:focus-within :deep(.hover-show-img) {
  opacity: 1;
}
@media (prefers-reduced-motion: reduce) {
  .mm-poster-animate {
    transition: none;
    transform: none !important;
  }
}
</style>
