<template>
  <div class="mm-user-info">
    <div class="mm-form-grid">
      <BaseTextInput
        label="Nome"
        :model-value="modelValue.name"
        :readonly="allReadOnly"
        @update:model-value="update('name', $event)"
      /><BaseTextInput
        label="E-mail"
        type="email"
        :model-value="modelValue.email"
        :readonly="allReadOnly"
        @update:model-value="update('email', $event)"
      /><label class="mm-checkbox"
        ><input
          type="checkbox"
          :checked="modelValue.preferences?.notify"
          :disabled="allReadOnly"
          @change="notifications"
        />Notificações por e-mail</label
      >
    </div>
    <dl class="mm-user-stats">
      <div>
        <dt>Perfil de acesso</dt>
        <dd>{{ modelValue.roles?.join(', ') }}</dd>
      </div>
      <div>
        <dt>Conta criada em</dt>
        <dd>{{ DateUtils.toLocaleString(modelValue.created_at) }}</dd>
      </div>
      <div v-if="showAdmInfo">
        <dt>Último login</dt>
        <dd>{{ DateUtils.toLocaleString(modelValue.statistics?.last_login_at) }}</dd>
      </div>
      <div v-if="showAdmInfo">
        <dt>Tentativas de login com falha</dt>
        <dd>{{ modelValue.statistics?.consecutive_failed_login_attempts }}</dd>
      </div>
      <div>
        <dt>Filmes cadastrados</dt>
        <dd>{{ modelValue.statistics?.registered_movies }}</dd>
      </div>
      <div>
        <dt>Avaliações</dt>
        <dd>{{ modelValue.statistics?.ratings_given }}</dd>
      </div>
      <div>
        <dt>Tempo de exibição</dt>
        <dd>{{ StringUtils.runtimeToText(modelValue.statistics?.display_time) }}</dd>
      </div>
      <div>
        <dt>Nota média</dt>
        <dd>{{ modelValue.statistics?.average_rating_movies?.toFixed(2) }}</dd>
      </div>
    </dl>
  </div>
</template>
<script setup lang="ts">
import type User from 'src/core/domain/user/User';
import BaseTextInput from './BaseTextInput.vue';
import DateUtils from 'src/core/utils/DateUtils';
import StringUtils from 'src/core/utils/StringUtils';
const props = withDefaults(
  defineProps<{ modelValue: User; allReadOnly?: boolean; showAdmInfo?: boolean }>(),
  { allReadOnly: false, showAdmInfo: false },
);
const emit = defineEmits<{ 'update:modelValue': [value: User] }>();
function update(field: 'name' | 'email', value: string) {
  emit('update:modelValue', { ...props.modelValue, [field]: value });
}
function notifications(event: Event) {
  emit('update:modelValue', {
    ...props.modelValue,
    preferences: {
      ...props.modelValue.preferences,
      notify: (event.target as HTMLInputElement).checked,
    },
  });
}
</script>
<style scoped>
.mm-form-grid,
.mm-user-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}
.mm-user-stats {
  margin-top: 28px;
}
.mm-user-stats > div {
  padding: 18px;
  border-radius: 14px;
  background: var(--grey-mid);
}
.mm-user-stats dt {
  font-size: 0.8rem;
  opacity: 0.65;
}
.mm-user-stats dd {
  font-size: 1.15rem;
  margin: 8px 0 0;
}
.mm-checkbox {
  display: flex;
  align-items: center;
  gap: 10px;
}
</style>
