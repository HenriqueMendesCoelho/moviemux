<template>
  <div class="mm-user-info">
    <div class="mm-form-grid">
      <BaseTextInput
        :label="t('components.name')"
        :model-value="modelValue.name"
        :readonly="allReadOnly"
        @update:model-value="update('name', $event)"
      /><BaseTextInput
        :label="t('components.email')"
        type="email"
        :model-value="modelValue.email"
        :readonly="allReadOnly"
        @update:model-value="update('email', $event)"
      />
    </div>
    <label class="mm-checkbox"
      ><input
        type="checkbox"
        :checked="modelValue.preferences?.notify"
        :disabled="allReadOnly"
        @change="notifications"
      />{{ t('components.emailNotifications') }}</label
    >
    <dl class="mm-user-stats">
      <div>
        <dt>{{ t('components.accessRole') }}</dt>
        <dd>{{ modelValue.roles?.join(', ') }}</dd>
      </div>
      <div>
        <dt>{{ t('components.accountCreated') }}</dt>
        <dd>{{ DateUtils.toLocaleString(modelValue.created_at, locale) }}</dd>
      </div>
      <div v-if="showAdmInfo">
        <dt>{{ t('components.lastLogin') }}</dt>
        <dd>{{ DateUtils.toLocaleString(modelValue.statistics?.last_login_at, locale) }}</dd>
      </div>
      <div v-if="showAdmInfo">
        <dt>{{ t('components.failedLogins') }}</dt>
        <dd>
          {{ modelValue.statistics?.consecutive_failed_login_attempts?.toLocaleString(locale) }}
        </dd>
      </div>
      <div>
        <dt>{{ t('components.registeredMovies') }}</dt>
        <dd>{{ modelValue.statistics?.registered_movies?.toLocaleString(locale) }}</dd>
      </div>
      <div>
        <dt>{{ t('components.ratings') }}</dt>
        <dd>{{ modelValue.statistics?.ratings_given?.toLocaleString(locale) }}</dd>
      </div>
      <div>
        <dt>{{ t('components.watchTime') }}</dt>
        <dd>{{ StringUtils.runtimeToText(modelValue.statistics?.display_time, locale) }}</dd>
      </div>
      <div>
        <dt>{{ t('components.averageRating') }}</dt>
        <dd>
          {{
            modelValue.statistics?.average_rating_movies?.toLocaleString(locale, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          }}
        </dd>
      </div>
    </dl>
  </div>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t, locale } = useI18n();
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
.mm-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}
.mm-user-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 18px;
  margin: 24px 0 0;
  padding-top: 24px;
  border-top: 1px solid var(--mm-border);
}
.mm-user-stats > div {
  min-width: 0;
}
.mm-user-stats dt {
  font-size: 0.8rem;
  color: var(--mm-muted);
}
.mm-user-stats dd {
  font-size: 1rem;
  margin: 6px 0 0;
  overflow-wrap: anywhere;
}
.mm-checkbox {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
}
@media (max-width: 620px) {
  .mm-form-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
  }
}
</style>
