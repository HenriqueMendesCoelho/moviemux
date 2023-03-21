<template>
  <div class="row justify-center">
    <div class="row col-8">
      <div :class="isMobile ? 'col-12' : 'col-11'">
        <InputText :label="'Nome'" v-model="user.name" :readOnly="allReadOnly" />
      </div>
      <div :class="isMobile ? 'col-12' : 'col'">
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
    <div class="q-mt-md" :class="isMobile ? 'col-12 row' : 'col-8 row'">
      <InputText class="col" :label="'Email'" v-model="user.email" :readOnly="allReadOnly" />
      <q-input
        v-model="user.statistics.consecutive_failed_login_attempts"
        v-if="showAdmInfo"
        :class="isMobile ? 'col-12' : 'col-6 q-ml-sm q-pl-sm'"
        square
        filled
        standout="text-info"
        color="info"
        label="Quantidade de tentativas de login"
        dark
        :readonly="true"
      />
    </div>
    <div class="q-mt-md" :class="isMobile ? 'col-12' : 'col-8'">
      <div class="row">
        <div :class="isMobile ? 'col-12' : 'col-6 q-pr-sm'">
          <q-input
            :model-value="user.roles.join(',')"
            square
            filled
            standout="text-info"
            color="info"
            label="Perfil de Acesso"
            dark
            :readonly="true"
          />
        </div>
        <div :class="isMobile ? 'col-12' : 'col-6 q-pl-sm'">
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
    <div class="q-mt-md q-mb-xl" :class="isMobile ? 'col-12' : 'col-8'">
      <div class="row">
        <div :class="isMobile ? 'col-12' : 'col-6 q-pr-sm'">
          <q-input
            :model-value="new Date(user.updated_at).toLocaleString()"
            square
            filled
            standout="text-info"
            color="info"
            label="Quantidade de filmes cadastrados"
            dark
            :readonly="true"
          />
        </div>
        <div :class="isMobile ? 'col-12 q-mt-md' : 'col-6 q-pl-sm'">
          <q-input
            :model-value="user.statistics.ratings_given"
            square
            filled
            standout="text-info"
            color="info"
            label="Quantidade de notas cadastrados"
            dark
            :readonly="true"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" scoped>
import { defineComponent, PropType } from 'vue';

import User from '@/domain/user/User';

import InputText from '@/components/shared/inputText/InputText.vue';
import CustomTooltip from '@/components/shared/customTooltip/CustomTooltip.vue';

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
    };
  },
  emits: ['update:modelValue'],
  mounted() {
    if (this.modelValue) {
      this.user = this.modelValue;
    }
  },
  computed: {
    isMobile(): boolean | undefined {
      return this.$q.platform.is.mobile;
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
