<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRuntimeConfig } from '#imports';
import BaseSkeleton from '~/core/components/BaseSkeleton.vue';
import { tmdbImageUrl, tmdbPosterSrcset } from '~/modules/movie/utils/MovieStateUtils';
import { entryTitle, type RankingEntry } from '../services/RankingCatalogService';

const props = defineProps<{ entry: RankingEntry; selected: boolean }>();
const emit = defineEmits<{ select: [] }>();
const { locale, t } = useI18n();
const titleId = useId(),
  metaId = useId();
const configuredBase = String(useRuntimeConfig().public.tmdbImageBase || '').replace(/\/+$/, '');
const canonicalBase = 'https://image.tmdb.org/t/p';
const filename = /^([A-Za-z0-9_-]+\.(?:jpg|jpeg|png|webp|avif))$/i;
const rendition = /^(?:w\d+(?:_and_h\d+_bestv\d+)?|original)\//;
const poster = computed(() => {
  const value = props.entry.url_image;
  if (!value) return '';
  // The shared helper also accepts arbitrary absolute URLs. Ranking metadata must
  // not cause browser requests to unrelated hosts, arbitrary paths, or URLs with queries.
  const relative = filename.exec(value.replace(/^\//, '').replace(rendition, ''));
  if (relative) {
    const base = /^https?:\/\/[^/?#]+(?:\/[^?#]*)?$/i.test(configuredBase)
      ? configuredBase
      : canonicalBase;
    return tmdbImageUrl(base, relative[1], 'w185');
  }
  const candidates = [configuredBase, canonicalBase, 'http://image.tmdb.org/t/p'];
  for (const base of candidates) {
    if (!/^https?:\/\//i.test(base) || !value.startsWith(`${base}/`)) continue;
    const path = value.slice(base.length + 1);
    if (!rendition.test(path)) continue;
    const file = filename.exec(path.replace(rendition, ''));
    if (file)
      return tmdbImageUrl(
        base === 'http://image.tmdb.org/t/p' ? canonicalBase : base,
        file[1],
        'w185',
      );
  }
  return '';
});
const srcset = computed(() => tmdbPosterSrcset(configuredBase, poster.value));
const imageState = ref<'loading' | 'loaded' | 'failed'>('loading');
watch(
  poster,
  () => {
    imageState.value = 'loading';
  },
  { flush: 'sync' },
);
function imageEvent(event: Event, state: 'loaded' | 'failed') {
  if ((event.currentTarget as HTMLImageElement | null)?.getAttribute('src') === poster.value)
    imageState.value = state;
}
const title = computed(() => entryTitle(props.entry, locale.value, t('rankingDetail.untitled')));
const year = computed(() => {
  const date = props.entry.release_date;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return '';
  const parsed = new Date(date + 'T00:00:00Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date
    ? date.slice(0, 4)
    : '';
});
const runtime = computed(() => {
  const minutes = props.entry.runtime;
  return minutes !== null && Number.isSafeInteger(minutes) && minutes > 0
    ? new Intl.NumberFormat(locale.value, {
        style: 'unit',
        unit: 'minute',
        unitDisplay: 'short',
      }).format(minutes)
    : '';
});
</script>
<template>
  <button
    class="mm-ranking-entry-card"
    type="button"
    :aria-pressed="selected"
    :aria-labelledby="titleId"
    :aria-describedby="year || runtime ? metaId : undefined"
    @click="emit('select')"
  >
    <span class="mm-entry-poster" aria-hidden="true">
      <img
        v-if="poster && imageState !== 'failed'"
        :key="poster"
        :src="poster"
        :srcset="srcset"
        sizes="52px"
        width="52"
        height="78"
        alt=""
        loading="lazy"
        decoding="async"
        draggable="false"
        referrerpolicy="no-referrer"
        @load="imageEvent($event, 'loaded')"
        @error="imageEvent($event, 'failed')"
      />
      <BaseSkeleton
        v-if="poster && imageState === 'loading'"
        class="mm-entry-poster-loading"
        shape="block"
      />
      <span v-else-if="!poster || imageState === 'failed'" class="mm-entry-poster-fallback"
        >🎬</span
      >
    </span>
    <span class="mm-entry-copy">
      <strong :id="titleId">{{ title }}</strong>
      <span v-if="year || runtime" :id="metaId" class="mm-entry-meta">
        <span v-if="year">{{ year }}</span>
        <span v-if="year && runtime" aria-hidden="true">·</span>
        <span v-if="runtime">{{ runtime }}</span>
      </span>
    </span>
  </button>
</template>
<style scoped>
.mm-ranking-entry-card {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr);
  align-items: center;
  gap: 14px;
  width: 100%;
  min-width: 0;
  min-height: 98px;
  padding: 9px 12px;
  border: 1px solid var(--mm-border);
  border-radius: 16px;
  background: var(--mm-surface);
  color: var(--mm-text);
  cursor: pointer;
  text-align: start;
}
.mm-ranking-entry-card[aria-pressed='true'] {
  border-color: #00f6ff;
  box-shadow: inset 3px 0 #00f6ff;
}
.mm-ranking-entry-card:focus-visible {
  outline: 2px solid var(--mm-focus-ring);
  outline-offset: 3px;
}
.mm-entry-poster {
  position: relative;
  display: block;
  width: 52px;
  height: 78px;
  overflow: hidden;
  border-radius: 8px;
  background: var(--mm-raised);
}
.mm-entry-poster img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.mm-entry-poster-loading {
  position: absolute;
  inset: 0;
}
.mm-entry-poster-fallback {
  display: grid;
  height: 100%;
  place-items: center;
}
.mm-entry-copy {
  min-width: 0;
  overflow-wrap: anywhere;
}
.mm-entry-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0 7px;
  color: var(--mm-muted);
  margin-top: 4px;
}
</style>
