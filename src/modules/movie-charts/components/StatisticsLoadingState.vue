<template>
  <BaseLoadingState label="Carregando estatísticas…">
    <div class="mm-stat-loading-grid">
      <div v-for="n in 3" :key="n" class="mm-stat-loading-card">
        <BaseSkeleton width="60%" /><BaseSkeleton width="45%" height="2rem" />
      </div>
    </div>
    <div class="mm-chart-loading-grid">
      <div v-for="n in 2" :key="n" class="mm-chart-loading-card">
        <BaseSkeleton width="55%" height="1.2rem" />
        <div class="mm-chart-loading-bars">
          <BaseSkeleton
            v-for="height in ['40%', '65%', '50%', '85%', '72%']"
            :key="height"
            shape="block"
            :height="height"
          />
        </div>
      </div>
    </div>
  </BaseLoadingState>
</template>
<script setup lang="ts">
import BaseLoadingState from 'src/core/components/BaseLoadingState.vue';
import BaseSkeleton from 'src/core/components/BaseSkeleton.vue';
</script>
<style scoped>
.mm-stat-loading-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
  margin: 24px 0;
}
.mm-stat-loading-card,
.mm-chart-loading-card {
  border: 1px solid var(--mm-border);
  background: var(--mm-surface);
  border-radius: 20px;
  padding: 24px;
  min-width: 0;
}
.mm-stat-loading-card {
  display: grid;
  gap: 1rem;
}
.mm-chart-loading-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}
.mm-chart-loading-bars {
  display: flex;
  align-items: end;
  gap: 8%;
  height: 240px;
  padding-top: 2rem;
}
@media (max-width: 850px) {
  .mm-chart-loading-grid {
    grid-template-columns: 1fr;
  }
  .mm-stat-loading-grid {
    gap: 10px;
  }
  .mm-stat-loading-card {
    padding: 16px;
  }
}
@media (max-width: 500px) {
  .mm-stat-loading-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .mm-stat-loading-card:last-child {
    grid-column: 1 / -1;
  }
  .mm-stat-loading-card {
    padding: 12px;
  }
  .mm-chart-loading-card {
    padding: 16px 10px;
  }
}
</style>
