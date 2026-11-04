<template>
  <BaseLoadingState :label="t('account.loadingProfile')">
    <div class="mm-profile-loading-fields">
      <div v-for="n in 2" :key="n">
        <BaseSkeleton width="5rem" height="0.7rem" /><BaseSkeleton shape="block" height="44px" />
      </div>
    </div>
    <BaseSkeleton width="65%" height="44px" class="mm-profile-loading-preference" />
    <div class="mm-profile-loading-details">
      <div v-for="n in 6" :key="n">
        <BaseSkeleton width="7rem" height="0.7rem" /><BaseSkeleton width="60%" />
      </div>
    </div>
  </BaseLoadingState>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
import BaseLoadingState from 'src/core/components/BaseLoadingState.vue';
import BaseSkeleton from 'src/core/components/BaseSkeleton.vue';
</script>
<style scoped>
.mm-profile-loading-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}
.mm-profile-loading-fields > div,
.mm-profile-loading-details > div {
  display: grid;
  gap: 0.7rem;
  min-width: 0;
}
.mm-profile-loading-preference {
  margin: 1.25rem 0;
}
.mm-profile-loading-details {
  border-top: 1px solid var(--mm-border);
  padding-top: 1.5rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 18px;
}
@media (max-width: 620px) {
  .mm-profile-loading-fields {
    grid-template-columns: 1fr;
  }
}
</style>
