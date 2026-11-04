<template>
  <div class="mm-statistics-placeholder" aria-hidden="true" aria-busy="true">
    <div v-if="part === 'summary'" class="mm-stat-loading-grid">
      <div v-for="n in 3" :key="n" class="mm-stat-loading-card">
        <BaseSkeleton width="60%" /><BaseSkeleton width="45%" height="2rem" />
      </div>
    </div>
    <div v-else-if="part === 'monthly'" class="mm-chart-loading-card mm-monthly-loading-card">
      <BaseSkeleton width="55%" height="1.2rem" /><BaseSkeleton width="40%" />
      <div class="mm-chart-loading-bars">
        <BaseSkeleton
          v-for="(height, index) in ['90%', '65%', '65%', '45%', '25%', '25%', '5%']"
          :key="index"
          shape="block"
          :height="height"
        />
      </div>
    </div>
    <div v-else class="mm-chart-loading-card mm-genres-loading-card">
      <BaseSkeleton width="45%" height="1.2rem" /><BaseSkeleton width="90%" />
      <div class="mm-genres-loading-bars">
        <div
          v-for="(width, index) in [
            '100%',
            '88%',
            '87%',
            '62%',
            '61%',
            '49%',
            '46%',
            '36%',
            '32%',
            '28%',
            '12%',
            '8%',
            '8%',
            '8%',
            '3%',
            '3%',
            '1%',
            '1%',
          ]"
          :key="index"
        >
          <BaseSkeleton width="25%" height="0.7rem" /><BaseSkeleton :width="width" height="6px" />
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import BaseSkeleton from 'src/core/components/BaseSkeleton.vue';
defineProps<{ part: 'summary' | 'monthly' | 'genres' }>();
</script>
<style scoped>
.mm-statistics-placeholder {
  min-width: 0;
}
.mm-stat-loading-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 16px 0 20px;
}
.mm-stat-loading-card,
.mm-chart-loading-card {
  border: 1px solid var(--mm-border);
  background: var(--mm-surface);
  border-radius: 18px;
  padding: 18px;
  min-width: 0;
}
.mm-stat-loading-card,
.mm-chart-loading-card {
  display: grid;
  gap: 1rem;
}
.mm-chart-loading-bars {
  display: flex;
  align-items: end;
  gap: 8%;
  height: 276px;
  padding: 24px 4% 12px;
}
.mm-chart-loading-bars > * {
  flex: 1;
}
.mm-genres-loading-bars {
  display: grid;
  gap: 14px;
  margin-top: 4px;
}
.mm-genres-loading-bars > div {
  display: grid;
  gap: 8px;
}
@media (max-width: 850px) {
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
    padding: 16px;
  }
}
</style>
