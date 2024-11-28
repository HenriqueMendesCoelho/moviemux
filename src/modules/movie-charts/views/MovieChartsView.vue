<template>
  <BaseContainerMain>
    <div class="row full-width justify-center">
      <BasePageTitle title="Dashboard" icon="dashboard" />
      <BaseHorizontalSeparator />
      <div class="col-12 row justify-center q-mt-lg q-gutter-x-lg">
        <div class="card-bordered justify-center text-center text-white q-pa-md">
          <div class="text-title-responsive-2">Total de filmes</div>
          <q-chip class="q-mt-md" color="kb-primary" text-color="white" icon="movie" size="30px">
            {{ chartsData?.total_number_of_movies }}
          </q-chip>
        </div>
        <div class="card-bordered justify-center text-center text-white q-pa-md">
          <div class="text-title-responsive-2">Tempo médio dos filmes</div>
          <q-chip class="q-mt-md" color="kb-primary" text-color="white" icon="hourglass_empty" size="30px">
            {{ StringUtils.runtimeToText(chartsData?.average_runtime) }}
          </q-chip>
        </div>
        <div class="card-bordered justify-center text-center text-center text-white q-pa-md">
          <div class="text-title-responsive-2">Nota Média</div>
          <q-knob
            class="text-white q-ma-md"
            v-model="knobAvgNote"
            :thickness="0.18"
            :min="0"
            :max="10"
            color="kb-primary"
            track-color="kb-primary-alt"
            size="80px"
            readonly
            show-value
          />
        </div>
      </div>
      <div class="col-auto row justify-center q-gutter-md q-mt-lg">
        <div class="col-auto bg-grey-mid card-bordered">
          <q-no-ssr>
            <MovieSixMonthsAgoChart :charts-data="chartsData" />
          </q-no-ssr>
        </div>
        <div class="col-auto bg-grey-mid card-bordered">
          <q-no-ssr>
            <MovieByGenderChart :charts-data="chartsData" />
          </q-no-ssr>
        </div>
      </div>
    </div>
  </BaseContainerMain>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';

import type { MovieStatistics } from 'src/core/types/statistics/Statistics';

import BaseContainerMain from 'src/core/components/BaseContainerMain.vue';
import BasePageTitle from 'src/core/components/BasePageTitle.vue';
import BaseHorizontalSeparator from 'src/core/components/BaseHorizontalSeparator.vue';
import MovieSixMonthsAgoChart from '../components/MovieSixMonthsAgoChart.vue';
import MovieByGenderChart from '../components/MovieByGenderChart.vue';

import StatisticService from '../services/StatisticService';
import StringUtils from 'src/core/utils/StringUtils';
import { hideLoading, showLoading } from 'src/core/utils/LoadingUtils';
import { showError } from 'src/core/utils/NotificationUtils';

const chartsData = ref<MovieStatistics>();
const knobAvgNote = ref<number>(0);

onMounted(() => {
  getChartsData();
});

async function getChartsData() {
  try {
    showLoading();
    const res = await StatisticService.movies();
    chartsData.value = res;
    knobAvgNote.value = res.average_rate || 0;
  } catch {
    showError('Erro ao buscar dados. Tente novamente mais tarde.');
  } finally {
    hideLoading();
  }
}
</script>

<style lang="scss" scoped>
.card-bordered {
  border-radius: 15px;
  border: 3px solid var(--grey-mid2);
  box-shadow: 0 5px 20px var(--shadow);
  background-color: var(--grey-mid);

  @media only screen and (max-width: $breakpoint-md-min) {
    margin-top: 15px;
  }
}
</style>
