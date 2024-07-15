<template>
  <div class="row justify-center">
    <div class="row col-md-8 col-xs-12">
      <div class="col-md-11 col-xs-9">
        <BaseTextInput :label="'Nome'" v-model="user.name" :readonly="allReadOnly" />
      </div>
      <div class="col">
        <q-toggle
          v-model="user.preferences.notify"
          size="xl"
          color="kb-primary"
          checked-icon="notifications"
          unchecked-icon="notifications_off"
          :disable="allReadOnly"
        />
        <BaseTooltip anchor="bottom middle" :delay="500" style="font-size: 10pt">Notificações por e-mail</BaseTooltip>
      </div>
    </div>
    <div class="col-md-8 col-xs-12 q-mt-md">
      <div class="row q-col-gutter-md">
        <BaseTextInput class="col" :label="'Email'" v-model="user.email" :readonly="allReadOnly" />
        <q-input
          :model-value="user.statistics?.consecutive_failed_login_attempts"
          v-if="showAdmInfo"
          class="col-md-6 col-xs-12"
          square
          filled
          standout="text-info"
          color="info"
          label="Quantidade de tentativas de login"
          dark
          :readonly="true"
          type="number"
        />
      </div>
    </div>
    <div class="col-md-8 col-xs-12 q-mt-md">
      <div class="row q-col-gutter-md">
        <div class="col-md col-xs-12">
          <q-input
            :model-value="user.roles?.join(', ')"
            square
            filled
            standout="text-info"
            color="info"
            label="Perfil de Acesso"
            dark
            :readonly="true"
          />
        </div>
        <div class="col-md col-xs-12">
          <q-input
            :model-value="DateUtils.toLocaleString(user.created_at)"
            square
            filled
            standout="text-info"
            color="info"
            label="Data criação da conta"
            dark
            :readonly="true"
          />
        </div>
        <div class="col-md col-xs-12" v-if="showAdmInfo">
          <q-input
            :model-value="DateUtils.toLocaleString(user.statistics.last_login_at)"
            square
            filled
            standout="text-info"
            color="info"
            label="Data Último Login"
            dark
            :readonly="true"
          />
        </div>
      </div>
    </div>
    <div class="col-md-8 col-xs-12 q-mt-md">
      <div class="row q-col-gutter-md">
        <div class="col-md col-xs-6">
          <q-input
            :model-value="user.statistics.registered_movies"
            square
            filled
            standout="text-info"
            color="info"
            label="Filmes cadastrados"
            dark
            :readonly="true"
          />
        </div>
        <div class="col-md col-xs-6">
          <q-input
            :model-value="user.statistics?.ratings_given"
            square
            filled
            standout="text-info"
            color="info"
            label="Notas cadastrados"
            dark
            :readonly="true"
          />
        </div>
        <div class="col-md col-xs-6">
          <q-input
            :model-value="displayTimeToText()"
            square
            filled
            standout="text-info"
            color="info"
            label="Tempo de Exibição"
            dark
            :readonly="true"
          />
        </div>
        <div class="col-md col-xs-6">
          <q-input
            :model-value="user.statistics.average_rating_movies?.toFixed(2)"
            square
            filled
            standout="text-info"
            color="info"
            label="Nota Média"
            dark
            :readonly="true"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';

import User from 'src/domain/user/User';

import BaseTextInput from 'src/core/components/BaseTextInput.vue';
import BaseTooltip from 'src/core/components/BaseTooltip.vue';

import StringUtils from 'src/utils/StringUtils';
import DateUtils from 'src/utils/DateUtils';

interface Props {
  modelValue: User;
  allReadOnly?: boolean;
  showAdmInfo?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  allReadOnly: false,
  showAdmInfo: false,
});

const user = ref(new User());

const emit = defineEmits<{
  (e: 'update:modelValue', value: User): void;
}>();

onMounted(() => {
  if (props.modelValue) {
    user.value = props.modelValue;
  }
});

watch(
  () => props.modelValue,
  (val) => {
    user.value = val;
  }
);

watch(
  () => user.value,
  (val) => {
    emit('update:modelValue', val);
  }
);

function displayTimeToText() {
  return StringUtils.runtimeToText(user.value?.statistics?.display_time);
}
</script>
src/utils/StringUtils
