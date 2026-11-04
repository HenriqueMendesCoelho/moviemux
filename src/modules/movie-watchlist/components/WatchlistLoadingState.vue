<template>
  <BaseLoadingState :label="detail ? 'Carregando lista…' : 'Carregando listas…'">
    <template v-if="detail">
      <div class="mm-list-loading-heading">
        <BaseSkeleton width="55%" height="2rem" /><BaseSkeleton width="12rem" /><BaseSkeleton
          shape="block"
          height="44px"
        />
      </div>
      <div class="mm-poster-grid">
        <div v-for="n in 6" :key="n" class="mm-list-loading-poster">
          <BaseSkeleton shape="block" /><BaseSkeleton width="80%" />
        </div>
      </div>
    </template>
    <div v-else class="mm-list-loading-grid">
      <div v-for="n in 3" :key="n" class="mm-list-loading-card">
        <div class="mm-list-loading-preview">
          <BaseSkeleton v-for="i in 3" :key="i" shape="block" />
        </div>
        <div class="mm-list-loading-body">
          <BaseSkeleton width="75%" height="2.73rem" /><BaseSkeleton width="45%" /><BaseSkeleton
            width="60%"
            height="0.7rem"
          />
          <div class="mm-list-loading-footer">
            <BaseSkeleton width="7rem" /><BaseSkeleton width="4rem" />
          </div>
        </div>
      </div>
    </div>
  </BaseLoadingState>
</template>
<script setup lang="ts">
import BaseLoadingState from 'src/core/components/BaseLoadingState.vue';
import BaseSkeleton from 'src/core/components/BaseSkeleton.vue';
withDefaults(defineProps<{ detail?: boolean }>(), { detail: false });
</script>
<style scoped>
.mm-list-loading-heading {
  display: grid;
  gap: 1rem;
  margin: 1rem 0 1.5rem;
}
.mm-list-loading-poster {
  display: grid;
  gap: 0.8rem;
  min-width: 0;
}
.mm-list-loading-poster > :first-child {
  aspect-ratio: 2/3;
  height: auto;
}
.mm-list-loading-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr));
  gap: 1.5rem;
}
.mm-list-loading-card {
  overflow: hidden;
  border: 1px solid var(--mm-border);
  border-radius: 16px;
}
.mm-list-loading-preview {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 3px;
  height: 128px;
}
.mm-list-loading-body {
  display: grid;
  gap: 0.9rem;
  padding: 17px 18px 14px;
}
.mm-list-loading-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-top: 1px solid var(--mm-border);
  padding-top: 12px;
  min-height: 45px;
}
@media (max-width: 600px) {
  .mm-list-loading-poster:nth-child(n + 5) {
    display: none;
  }
}
</style>
