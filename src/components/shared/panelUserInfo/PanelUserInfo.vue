<template>
  <div class="row justify-center">
    <div class="row col-8">
      <div class="col-md-11 col-sm-12">
        <InputText :label="'Nome'" v-model="user.name" :readOnly="allReadOnly" />
      </div>
      <div class="col-md col-sm-12">
        <q-toggle
          v-model="user.preferences.notify"
          size="xl"
          color="kb-primary"
          checked-icon="notifications"
          unchecked-icon="notifications_off"
          :disable="allReadOnly"
        />
        <CustomTooltip anchor="bottom middle" :delay="500" style="font-size: 10pt">Notificações por e-mail</CustomTooltip>
      </div>
    </div>
    <div class="col-md-8 col-sm-12 q-mt-md">
      <div class="row q-col-gutter-md">
        <InputText class="col" :label="'Email'" v-model="user.email" :readOnly="allReadOnly" />
        <q-input
          :model-value="user.statistics?.consecutive_failed_login_attempts"
          v-if="showAdmInfo"
          class="col-md-6 col-sm-12"
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
    <div class="col-md-8 col-sm-12 q-mt-md">
      <div class="row q-col-gutter-md">
        <div class="col-md-6 col-sm-12">
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
        <div class="col-md-6 col-sm-12">
          <q-input
            :model-value="new Date(user.created_at).toLocaleString()"
            square
            filled
            standout="text-info"
            color="info"
            label="Data criação da conta"
            dark
            :readonly="true"
          />
        </div>
      </div>
    </div>
    <div class="col-md-8 col-sm-12 q-mt-md">
      <div class="row q-col-gutter-md">
        <div class="col-md col-sm-12">
          <q-input
            :model-value="user.statistics.registered_movies"
            square
            filled
            standout="text-info"
            color="info"
            label="Quantidade de filmes cadastrados"
            dark
            :readonly="true"
          />
        </div>
        <div class="col-md col-sm-12">
          <q-input
            :model-value="user.statistics?.ratings_given"
            square
            filled
            standout="text-info"
            color="info"
            label="Quantidade de notas cadastrados"
            dark
            :readonly="true"
          />
        </div>
        <div class="col-md col-sm-12">
          <q-input
            :model-value="runtimeToText()"
            square
            filled
            standout="text-info"
            color="info"
            label="Tempo de Exibição"
            dark
            :readonly="true"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';

import User from 'src/domain/user/User';

import InputText from 'src/components/shared/inputText/InputText.vue';
import CustomTooltip from 'src/components/shared/customTooltip/CustomTooltip.vue';

export default defineComponent({
  name: 'PanelUserInfo',
  props: {
    modelValue: {
      type: Object as PropType<User>,
      required: true,
    },
    allReadOnly: {
      type: Boolean,
      default: false,
    },
    showAdmInfo: {
      type: Boolean,
      default: false,
    },
  },
  components: { InputText, CustomTooltip },
  data() {
    return {
      no: true,
      user: new User(),
      teste: true,
    };
  },
  emits: ['update:modelValue'],
  mounted() {
    if (this.modelValue) {
      this.user = this.modelValue;
    }
  },
  methods: {
    runtimeToText() {
      const runtime = this.user.statistics?.theoretical_total_minutes_watched;
      if (!runtime) {
        return '0';
      }
      const hours = Math.floor(runtime / 60);
      const minutes = runtime % 60;

      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    },
  },
  watch: {
    modelValue() {
      if (this.modelValue) {
        this.user = this.modelValue;
      }
    },
    user() {
      this.$emit('update:modelValue', this.user);
    },
  },
});
</script>
