<template>
  <BaseFloatingActionBtn
    ><template #after-top
      ><router-link class="mm-button mm-button-primary" :to="{ name: 'add' }"
        >+ {{ t('catalog.addMovie') }}</router-link
      ></template
    ></BaseFloatingActionBtn
  >
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
import BaseFloatingActionBtn from 'src/core/components/BaseFloatingActionBtn.vue';
</script>
