<template>
  <BaseContainerMain>
    <header class="mm-dashboard-heading">
      <div>
        <h1>{{ t('library.statistics') }}</h1>
        <p class="mm-dashboard-caption">{{ t('library.dashboardCaption') }}</p>
      </div>
      <button class="mm-button" :disabled="loading" @click="getChartsData">
        {{ loading ? t('library.refreshing') : t('library.refresh') }}
      </button>
    </header>
    <p v-if="error" role="alert">{{ t(error) }}</p>
    <p v-if="catalogPending" class="mm-sr-only" role="status">
      {{ t('library.loadingStatistics') }}
    </p>
    <StatisticsLoadingState v-if="catalogPending" part="summary" />
    <div v-if="chartsData" class="mm-stat-grid">
      <article class="mm-stat-card">
        <span>{{ t('library.catalogMovies') }}</span
        ><strong>{{ catalogTotal?.toLocaleString(locale) ?? '—' }}</strong>
      </article>
      <article class="mm-stat-card">
        <span>{{ t('library.catalogDuration') }}</span
        ><strong>{{ formatDuration(catalogRuntime, locale) }}</strong>
      </article>
      <article class="mm-stat-card">
        <span>{{ t('library.siteRating') }}</span
        ><strong
          >{{ formatRating(catalogRating, locale)
          }}<small v-if="catalogRating !== null"> / 10</small></strong
        >
        <div
          v-if="catalogRating !== null"
          class="mm-average-track"
          role="meter"
          :aria-valuenow="catalogRating"
          :aria-valuemin="0"
          :aria-valuemax="10"
          :aria-valuetext="
            t('library.ratingOutOf', { rating: formatRating(catalogRating, locale) })
          "
          :aria-label="t('library.siteRatingLabel')"
        >
          <span :style="{ width: `${catalogRating * 10}%` }" />
        </div>
      </article>
    </div>
    <p v-if="catalogRating === 0" class="mm-dashboard-caption">
      {{ t('library.zeroSiteRatingHelp') }}
    </p>
    <p v-if="catalogTotal === 0" class="mm-muted">
      {{ t('library.emptyCatalog') }}
    </p>
    <div v-if="userStore.user.isLoged" class="mm-chart-grid">
      <div class="mm-chart-column">
        <section v-if="chartsData" class="mm-chart-card mm-monthly-card">
          <ClientOnly
            ><MovieSixMonthsAgoChart :charts-data="chartsData" /><template #fallback
              ><BaseLoadingState :label="t('library.loadingChart')"
                ><BaseSkeleton shape="block" height="18rem" /></BaseLoadingState></template
          ></ClientOnly>
        </section>
        <StatisticsLoadingState v-else-if="catalogPending" part="monthly" />
        <section class="mm-chart-card mm-personal-card">
          <PersonalStatisticsCard
            :statistics="profileStatistics"
            :charts-data="chartsData"
            :loading="personalLoading || (!profileStatistics && !personalError)"
            :error="personalError ? t(personalError) : ''"
          />
        </section>
      </div>
      <section v-if="chartsData" class="mm-chart-card mm-genres-card">
        <MovieByGenderChart :charts-data="chartsData" />
      </section>
      <StatisticsLoadingState v-else-if="catalogPending" part="genres" />
    </div>
  </BaseContainerMain>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t, locale } = useI18n();
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { useUserStore } from 'src/core/stores/UserStore';
import type { MovieStatistics } from 'src/core/types/statistics/Statistics';
import StatisticsLoadingState from '../components/StatisticsLoadingState.vue';
import PersonalStatisticsCard from '../components/PersonalStatisticsCard.vue';
import BaseLoadingState from 'src/core/components/BaseLoadingState.vue';
import BaseSkeleton from 'src/core/components/BaseSkeleton.vue';
import BaseContainerMain from 'src/core/components/BaseContainerMain.vue';
import MovieSixMonthsAgoChart from '../components/MovieSixMonthsAgoChart.vue';
import MovieByGenderChart from '../components/MovieByGenderChart.vue';
import StatisticService from '../services/StatisticService';
import UserService from 'src/core/services/UserService';
import {
  formatDuration,
  formatRating,
  nonNegativeNumber,
  personalStatistics,
  rating,
  type PersonalStatistics,
} from '../utils/statisticsComparison';
import { showError } from 'src/core/utils/NotificationUtils';

const userStore = useUserStore();
const chartsData = ref<MovieStatistics>();
const profileStatistics = ref<PersonalStatistics>();
const catalogLoading = ref(false);
const personalLoading = ref(false);
const loading = computed(() => catalogLoading.value || personalLoading.value);
const error = ref('');
const personalError = ref('');
const catalogPending = computed(() => !chartsData.value && !error.value && userStore.user.isLoged);
const catalogTotal = computed(() => nonNegativeNumber(chartsData.value?.total_number_of_movies));
const catalogRating = computed(() =>
  catalogTotal.value ? rating(chartsData.value?.average_rate) : null,
);
const catalogRuntime = computed(() =>
  catalogTotal.value ? nonNegativeNumber(chartsData.value?.average_runtime) : null,
);
let disposed = false;
let generation = 0;
let mounted = false;
onMounted(() => {
  mounted = true;
  void getChartsData();
});
onBeforeUnmount(() => {
  disposed = true;
  generation++;
});
watch(
  [
    () => userStore.user,
    () => userStore.user.id,
    () => userStore.user.generation,
    () => userStore.user.isLoged,
  ],
  () => {
    generation++;
    chartsData.value = undefined;
    profileStatistics.value = undefined;
    error.value = '';
    personalError.value = '';
    catalogLoading.value = false;
    personalLoading.value = false;
    if (mounted && userStore.user.isLoged) void getChartsData();
  },
  { flush: 'sync' },
);
async function getChartsData() {
  if (loading.value || disposed || !userStore.user.isLoged) return;
  const version = generation;
  const account = userStore.user.id;
  const session = userStore.user;
  const sessionGeneration = session.generation;
  const current = () =>
    !disposed &&
    version === generation &&
    account === userStore.user.id &&
    session === userStore.user &&
    sessionGeneration === userStore.user.generation &&
    userStore.user.isLoged;
  catalogLoading.value = true;
  personalLoading.value = true;
  error.value = '';
  personalError.value = '';
  await Promise.all([
    (async () => {
      try {
        const result = await StatisticService.movies();
        if (current()) chartsData.value = result;
      } catch {
        if (current()) {
          error.value = 'library.loadStatisticsFailed';
          showError(error.value);
        }
      } finally {
        if (current()) catalogLoading.value = false;
      }
    })(),
    (async () => {
      try {
        const result = await UserService.getUser();
        if (!current()) return;
        if (result.id !== account) throw new Error('Unexpected profile');
        profileStatistics.value = personalStatistics(result.statistics);
      } catch {
        if (current()) personalError.value = 'library.loadPersonalFailed';
      } finally {
        if (current()) personalLoading.value = false;
      }
    })(),
  ]);
}
</script>
<style scoped>
.mm-stat-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 16px 0 20px;
}
.mm-stat-card,
.mm-chart-card {
  padding: 18px;
  border: 1px solid var(--mm-border);
  background: var(--mm-surface);
  border-radius: 18px;
  min-width: 0;
}
.mm-stat-card > span {
  font-size: 0.85rem;
  color: var(--mm-muted);
}
.mm-stat-card strong {
  display: block;
  margin-top: 8px;
  font-size: 1.6rem;
  overflow-wrap: anywhere;
}
.mm-stat-card small {
  font-size: 1rem;
  color: var(--mm-muted);
}
.mm-average-track {
  height: 5px;
  background: var(--mm-border);
  border-radius: 4px;
  overflow: hidden;
  margin-top: 10px;
}
.mm-average-track span {
  display: block;
  height: 100%;
  background: #00f6ff;
}
.mm-dashboard-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.mm-dashboard-heading h1 {
  font-size: 1.8rem;
  margin: 0;
}
.mm-dashboard-caption {
  color: var(--mm-muted);
  font-size: 0.85rem;
  line-height: 1.5;
  margin: 8px 0 0;
}
.mm-chart-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
  align-items: start;
}
.mm-chart-column {
  display: grid;
  gap: 24px;
  min-width: 0;
}
@media (max-width: 850px) {
  .mm-chart-grid {
    grid-template-columns: 1fr;
  }
  .mm-stat-grid {
    gap: 10px;
  }
  .mm-stat-card {
    padding: 16px;
  }
  .mm-stat-card strong {
    font-size: 1.5rem;
  }
}
@media (max-width: 500px) {
  .mm-stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .mm-stat-card:last-child {
    grid-column: 1 / -1;
  }
  .mm-stat-card {
    padding: 12px;
  }
  .mm-chart-card {
    padding: 16px;
  }
}
</style>
