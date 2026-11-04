<template>
  <header class="mm-list-heading">
    <div class="mm-list-heading-line">
      <h1>{{ watchlist?.name || t('library.listTitle') }}</h1>
      <button
        v-if="isOwner"
        class="mm-rename-trigger"
        type="button"
        :disabled="disabled"
        @click="beginEdit"
        :aria-label="t('library.renameList')"
        :title="t('library.renameList')"
      >
        <BaseIcon name="edit" /><span>{{ t('library.rename') }}</span>
      </button>
    </div>
    <div class="mm-list-heading-meta">
      <span>{{ t('library.movieCount', watchlist?.movies_wishlists.length || 0) }}</span
      ><span aria-hidden="true">·</span
      ><span>{{ watchlist?.shareable ? t('library.publicList') : t('library.privateList') }}</span
      ><MovieWatchlistTooltipInfo v-if="watchlist" :watchlist="watchlist" />
    </div>
    <BaseModal v-model="editing" :title="t('library.renameList')">
      <form v-if="isOwner" class="mm-form" @submit.prevent="save">
        <label class="mm-field"
          >{{ t('library.listName')
          }}<input
            v-model="name"
            required
            minlength="3"
            maxlength="30"
            :disabled="disabled || saving"
            autofocus
        /></label>
        <div class="mm-actions">
          <button class="mm-button" type="button" :disabled="saving" @click="editing = false">
            {{ t('library.cancel') }}</button
          ><button class="mm-button mm-button-primary" :disabled="disabled || saving">
            {{ saving ? t('library.saving') : t('library.saveName') }}
          </button>
        </div>
      </form>
    </BaseModal>
  </header>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import type { WatchlistType } from 'src/core/types/movie-watchlist/WatchlistType';
import BaseModal from 'src/core/components/BaseModal.vue';
import BaseIcon from 'src/core/components/BaseIcon.vue';
import MovieWatchlistTooltipInfo from './MovieWatchlistTooltipInfo.vue';
import { useUserStore } from 'src/core/stores/UserStore';
const props = defineProps<{
  watchlist?: WatchlistType;
  disabled?: boolean;
  rename: (name: string) => Promise<boolean>;
}>();
const userStore = useUserStore();
const isOwner = computed(
  () => userStore.user.isLoged && props.watchlist?.user.id === userStore.user.id,
);
const editing = ref(false);
const saving = ref(false);
const name = ref('');
let generation = 0;
watch(
  () => [props.watchlist?.id, userStore.user.id],
  () => {
    generation++;
    editing.value = false;
    saving.value = false;
  },
);
onBeforeUnmount(() => generation++);
function beginEdit() {
  if (!isOwner.value || props.disabled) return;
  name.value = props.watchlist?.name || '';
  editing.value = true;
}
async function save() {
  if (
    !isOwner.value ||
    props.disabled ||
    saving.value ||
    name.value.trim().length < 3 ||
    name.value.trim().length > 30
  )
    return;
  const version = generation;
  saving.value = true;
  try {
    if ((await props.rename(name.value.trim())) && version === generation) editing.value = false;
  } finally {
    if (version === generation) saving.value = false;
  }
}
</script>
<style scoped>
.mm-list-heading {
  min-width: 0;
}
.mm-list-heading-line {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.mm-list-heading h1 {
  font-size: clamp(1.5rem, 2.8vw, 2rem);
  line-height: 1.2;
  letter-spacing: -0.035em;
  margin: 0;
  overflow-wrap: anywhere;
}
.mm-rename-trigger {
  display: inline-flex;
  gap: 7px;
  align-items: center;
  color: var(--mm-muted);
  min-height: 44px;
  padding: 8px;
  font-size: 0.75rem;
  border-radius: 8px;
}
.mm-rename-trigger:hover {
  background: var(--mm-raised);
  color: var(--mm-text);
}
.mm-rename-trigger svg {
  width: 16px;
  height: 16px;
}
.mm-list-heading-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 7px;
  font-size: 0.8rem;
  color: var(--mm-muted);
}
.mm-list-heading-meta > :last-child {
  margin-left: 4px;
}
@media (max-width: 600px) {
  .mm-rename-trigger span {
    display: none;
  }
  .mm-list-heading-line {
    gap: 4px;
  }
}
</style>
