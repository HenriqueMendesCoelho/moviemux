<template>
  <header class="mm-section-header">
    <div>
      <span class="mm-eyebrow">Coleção de filmes</span>
      <h1>{{ watchlist?.name || 'Lista de filmes' }}</h1>
      <form v-if="editing && isOwner" class="mm-inline-form" @submit.prevent="save">
        <input
          v-model="name"
          aria-label="Nome da lista"
          required
          minlength="3"
          maxlength="30"
          :disabled="disabled || saving"
        /><button class="mm-button mm-button-primary" :disabled="disabled || saving">Salvar</button
        ><button class="mm-button" type="button" :disabled="saving" @click="editing = false">
          Cancelar
        </button>
      </form>
      <button v-else-if="isOwner" class="mm-button" :disabled="disabled" @click="beginEdit">
        Renomear lista
      </button>
    </div>
    <MovieWatchlistTooltipInfo v-if="watchlist" :watchlist="watchlist" />
  </header>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import type { WatchlistType } from 'src/core/types/movie-watchlist/WatchlistType';
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
.mm-inline-form {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 16px;
}
.mm-inline-form input {
  min-width: 180px;
}
</style>
