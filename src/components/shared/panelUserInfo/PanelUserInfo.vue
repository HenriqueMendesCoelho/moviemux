<template>
  <div class="row justify-center">
    <div class="row col-8">
      <div :class="isMobile ? 'col-12' : 'col-11'">
        <InputText :label="'Nome'" v-model="user.name" :readOnly="allReadOnly" />
      </div>
      <div :class="isMobile ? 'col-12' : 'col'">
        <q-toggle
          size="xl"
          v-model="user.notifications"
          color="kb-primary"
          checked-icon="notifications"
          unchecked-icon="notifications_off"
          :disable="allReadOnly"
        />
        <CustomTooltip anchor="bottom middle" :delay="500" style="font-size: 10pt">Notificações por e-mail</CustomTooltip>
      </div>
    </div>
    <div class="q-mt-md" :class="isMobile ? 'col-12' : 'col-8'">
      <InputText :label="'Email'" v-model="user.email" :readOnly="true" />
    </div>
    <div class="q-mt-md" :class="isMobile ? 'col-12' : 'col-8'">
      <div class="row">
        <div :class="isMobile ? 'col-12' : 'col-6 q-pr-sm'">
          <q-input
            square
            filled
            standout="text-info"
            color="info"
            v-model="user.accessProfile"
            label="Perfil de Acesso"
            style="background-color: #343c4c"
            dark
            :readonly="allReadOnly"
          />
        </div>
        <div :class="isMobile ? 'col-12' : 'col-6 q-pl-sm'">
          <q-input
            square
            filled
            standout="text-info"
            color="info"
            :model-value="user.dtCreated.toLocaleString('pt-br')"
            label="Data criação da conta"
            style="background-color: #343c4c"
            dark
            :readonly="allReadOnly"
          />
        </div>
      </div>
    </div>
    <div class="q-mt-md q-mb-xl" :class="isMobile ? 'col-12' : 'col-8'">
      <div class="row">
        <div :class="isMobile ? 'col-12' : 'col-6 q-pr-sm'">
          <q-input
            square
            filled
            standout="text-info"
            color="info"
            v-model="user.qtdMovies"
            label="Quantidade de filmes cadastrados"
            dark
            :readonly="allReadOnly"
          />
        </div>
        <div :class="isMobile ? 'col-12 q-mt-md' : 'col-6 q-pl-sm'">
          <q-input
            square
            filled
            standout="text-info"
            color="info"
            v-model="user.qtdNotes"
            label="Quantidade de notas cadastrados"
            dark
            :readonly="allReadOnly"
            draggable="false"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" scoped>
import { defineComponent, PropType } from 'vue';

import InputText from '@/components/shared/inputText/InputText.vue';
import CustomTooltip from '@/components/shared/customTooltip/CustomTooltip.vue';

type userProp = {
  name: string;
  email: string;
  accessProfile: string;
  dtCreated: Date;
  qtdMovies: number;
  qtdNotes: number;
  notifications: boolean;
};

export default defineComponent({
  name: 'PanelUserInfo',
  props: {
    modelValue: {
      type: Object as PropType<userProp>,
      required: false,
    },
    allReadOnly: {
      type: Boolean,
      default: false,
    },
  },
  components: { InputText, CustomTooltip },
  data() {
    return {
      user: {
        name: '',
        email: '',
        accessProfile: '',
        dtCreated: new Date(),
        qtdMovies: 0,
        qtdNotes: 0,
        notifications: false,
      } as userProp,
    };
  },
  emits: ['update:modelValue'],
  mounted() {
    this.updateForm();
  },
  computed: {
    isMobile(): boolean | undefined {
      return this.$q.platform.is.mobile;
    },
  },
  methods: {
    updateForm() {
      this.user.name = this.modelValue?.name ?? '';
      this.user.email = this.modelValue?.email ?? '';
      this.user.accessProfile = this.modelValue?.accessProfile ?? '';
      this.user.dtCreated = this.modelValue?.dtCreated ?? new Date();
      this.user.qtdMovies = this.modelValue?.qtdMovies ?? 0;
      this.user.qtdNotes = this.modelValue?.qtdNotes ?? 0;
      this.user.notifications = this.modelValue?.notifications ?? false;
    },
  },
  watch: {
    modelValue() {
      this.updateForm();
      if (this.modelValue) this.user = this.modelValue;
    },
    user() {
      this.$emit('update:modelValue', this.user);
    },
  },
});
</script>
