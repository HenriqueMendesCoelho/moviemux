<template>
  <ContainerMain>
    <div class="row full-width justify-center">
      <PageTitle title="Dashboard" icon="dashboard" />
      <SeparatorDivLineSolidVue />
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
  </ContainerMain>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useQuasar } from 'quasar';

import type { MovieStatistics } from 'src/types/statistics/Statistics';

import ContainerMain from '../shared/containerMain/ContainerMain.vue';
import PageTitle from '../shared/pageTitle/PageTitle.vue';
import SeparatorDivLineSolidVue from '../shared/separator/SeparatorDivLineSolid.vue';
import MovieSixMonthsAgoChart from './movieSixMonthsAgoChart/MovieSixMonthsAgoChart.vue';
import MovieByGenderChart from './movieByGenderChart/MovieByGenderChart.vue';

import StatisticService from 'src/services/StatisticService';
import StringUtils from 'src/utils/StringUtils';

const $q = useQuasar();

const chartsData = ref<MovieStatistics>();
const knobAvgNote = ref<number>(0);

onMounted(() => {
  getChartsData();
});

function showLoading() {
  $q.loading.show({
    spinnerColor: 'kb-primary',
  });
}
function hideLoading() {
  $q.loading.hide();
}
function showError(msg: string) {
  $q.notify({
    type: 'negative',
    message: msg,
    position: 'top',
  });
}

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
