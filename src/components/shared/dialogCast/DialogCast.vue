<template>
  <q-dialog v-model="visible" @hide="emit('hide')" @before-show="getCredits">
    <q-card class="dialog-container q-pa-md relative-position">
      <div class="btn-absolute-wrapper">
        <q-btn style="position: fixed" color="white" icon="close" size="md" @click="visible = false" flat round />
      </div>

      <div class="row q-ml-md q-mb-md">
        <q-icon class="q-mr-md" color="white" name="groups" size="lg" />
        <div class="col-auto text-h4 text-white">Elenco</div>
      </div>

      <div class="justify-center align-center overflow-wrap-break-word">
        <div class="row col-auto justify-center" :class="isDesktop ? 'q-col-gutter-xl' : 'q-col-gutter-sm'" v-if="credits?.cast.length">
          <div class="col-auto" v-for="(castMember, index) in credits.cast" :key="index">
            <q-img
              class="img-person"
              :alt="castMember.character"
              :src="getImageUrl(castMember.profile_path)"
              :no-native-menu="true"
              :draggable="false"
              :width="getWidth()"
              :height="getHeight()"
            >
              <div class="absolute-bottom text-caption-custom text-center hover-show-img">
                {{ castMember.name }}<br />
                <i> {{ castMember.character }}</i>
              </div>
              <template v-slot:loading>
                <q-skeleton width="160px" height="230px" animation="fade" dark />
              </template>
              <template v-slot:error>
                <div class="absolute-full flex flex-center bg-grey-mid text-white text-center">
                  <div class="row justify-center">
                    <q-icon class="col-12 q-mb-xs" name="error" :size="isDesktop ? 'lg' : 'xs'" />
                    <p class="text-caption-custom" v-if="!isMobile">Erro ao carregar imagem</p>
                  </div>
                  <div class="text-caption-custom">
                    {{ castMember.name }}<br />
                    <i> {{ castMember.character }}</i>
                  </div>
                </div>
              </template>
            </q-img>
          </div>
        </div>
        <SeparatorDivLineSolid class="q-my-lg" />

        <div class="row q-ml-md q-mb-md">
          <q-icon class="q-mr-md" color="white" name="groups" size="lg" />
          <div class="col-auto text-h4 text-white q-mr-md">Time técnico</div>
          <q-btn
            :icon="showCrew ? 'keyboard_arrow_down' : 'keyboard_arrow_up'"
            size="md"
            @click="showCrew = !showCrew"
            color="white"
            round
            flat
          />
        </div>
        <q-slide-transition>
          <div
            class="row col-auto justify-center"
            :class="isDesktop ? 'q-col-gutter-xl' : 'q-col-gutter-sm'"
            v-if="credits?.cast.length"
            v-show="showCrew"
          >
            <div class="col-auto" v-for="(crewMember, index) in credits.crew" :key="index">
              <q-img
                class="img-person"
                :alt="crewMember.name"
                :src="getImageUrl(crewMember.profile_path)"
                :no-native-menu="true"
                :draggable="false"
                :width="getWidth()"
                :height="getHeight()"
              >
                <div class="absolute-bottom text-caption-custom text-center hover-show-img">
                  {{ crewMember.name }}<br />
                  <i> {{ crewMember.department }} - {{ crewMember.job }}</i>
                </div>
                <template v-slot:loading>
                  <q-skeleton width="160px" height="230px" animation="fade" dark />
                </template>
                <template v-slot:error>
                  <div class="absolute-full flex flex-center bg-grey-mid text-white text-center">
                    <div class="row justify-center">
                      <q-icon class="col-12 q-mb-md" name="error" :size="isDesktop ? 'lg' : 'xs'" />
                      <p class="text-caption-custom" v-if="!isMobile">Erro ao carregar imagem</p>
                    </div>
                    <div class="text-caption-custom">
                      {{ crewMember.name }}<br />
                      <i> {{ crewMember.department }} - {{ crewMember.job }}</i>
                    </div>
                  </div>
                </template>
              </q-img>
            </div>
          </div>
        </q-slide-transition>
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useQuasar } from 'quasar';

import type { Credits } from 'src/types/movie/MovieType';

import SeparatorDivLineSolid from '../separator/SeparatorDivLineSolid.vue';

import KitService from 'src/services/KitService';
import { hideLoading, showLoading } from 'src/utils/LoadingUtils';
import { showError } from 'src/utils/NotificationUtils';

const props = defineProps<{ modelValue: boolean; movieId: number }>();
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'hide', value: void): void;
}>();
const $q = useQuasar();
const isMobile = $q.platform.is.mobile;
const isDesktop = $q.platform.is.desktop;

const visible = ref(false);
const credits = ref<Credits>();
const showCrew = ref(false);

watch(
  () => props.modelValue,
  (val: boolean) => {
    visible.value = val;
  }
);
watch(
  () => visible.value,
  (val: boolean) => {
    emit('update:modelValue', val);
  }
);

async function getCredits() {
  try {
    showLoading();
    const res = await KitService.getMovieCredits(props.movieId);
    if (res) {
      credits.value = res;
    }
  } catch (error) {
    showError('Não foi possível encontrar o elenco do filme. Tente novamente mais tarde.');
    visible.value = false;
  } finally {
    hideLoading();
  }
}
function getImageUrl(path?: string, width: 'w45' | 'w185' | 'h632' | 'original' = 'w185') {
  return `https://image.tmdb.org/t/p/${width}${path}`;
}
function getHeight() {
  if (isMobile) {
    return '120px';
  }

  return '230px';
}
function getWidth() {
  if (isMobile) {
    return '80px';
  }

  return '160px';
}
</script>

<style lang="scss" scoped>
.dialog-container {
  background-color: var(--grey-dark2);

  min-width: 40vw !important;
  min-height: 60vh !important;

  border: var(--grey-mid) solid 5px;
  border-radius: 15px;
}

.btn-absolute-wrapper {
  position: absolute;
  top: 10px;
  right: 50px;
  z-index: 1;
}

.img-person {
  border-radius: 10px;
  transition: 0.2s ease-out;

  cursor: default;

  .hover-show-img {
    opacity: 0;
  }

  &:hover {
    .hover-show-img {
      opacity: 1;
      transition: opacity 0.3s ease-out;
    }
  }

  &:hover {
    transform: scale(1.02);
  }
}

.overflow-wrap-break-word {
  overflow-wrap: break-word;
}

.text-caption-custom {
  font-size: 0.8rem;

  @media only screen and (max-width: $breakpoint-md-min) {
    font-size: 0.5rem;
  }
}
</style>
