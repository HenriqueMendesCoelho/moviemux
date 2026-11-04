<template>
  <BaseLoadingState :label="editing ? 'Carregando formulário do filme…' : 'Carregando filme…'">
    <div class="mm-film-skeleton" :class="{ 'mm-film-skeleton-edit': editing }">
      <BaseSkeleton shape="block" class="mm-film-skeleton-poster" />
      <div class="mm-film-skeleton-heading">
        <BaseSkeleton width="44%" height="0.7rem" />
        <BaseSkeleton width="88%" height="2.2rem" />
        <BaseSkeleton width="62%" />
      </div>
      <div v-if="!editing" class="mm-film-skeleton-copy">
        <div class="mm-film-skeleton-disclosures">
          <BaseSkeleton width="48%" /><BaseSkeleton width="38%" />
        </div>
        <div class="mm-film-skeleton-tags">
          <BaseSkeleton v-for="n in 3" :key="n" width="5rem" height="1.65rem" />
        </div>
        <BaseSkeleton /><BaseSkeleton /><BaseSkeleton width="92%" /><BaseSkeleton width="72%" />
        <BaseSkeleton width="40%" />
        <div class="mm-film-skeleton-links">
          <BaseSkeleton width="6.5rem" height="44px" shape="block" /><BaseSkeleton
            width="6.5rem"
            height="44px"
            shape="block"
          />
        </div>
        <BaseSkeleton width="13rem" height="44px" shape="block" />
      </div>
      <div v-else class="mm-film-skeleton-fields">
        <div v-for="n in 6" :key="n">
          <BaseSkeleton width="40%" height="0.7rem" /><BaseSkeleton shape="block" height="44px" />
        </div>
        <BaseSkeleton shape="block" height="8rem" class="mm-film-skeleton-description" />
      </div>
    </div>
    <div v-if="!editing" class="mm-film-skeleton-reviews">
      <BaseSkeleton width="11rem" height="1.3rem" />
      <div v-for="n in 2" :key="n" class="mm-film-skeleton-review">
        <BaseSkeleton shape="circle" /><BaseSkeleton width="45%" /><BaseSkeleton width="3rem" />
      </div>
    </div>
  </BaseLoadingState>
</template>
<script setup lang="ts">
import BaseLoadingState from 'src/core/components/BaseLoadingState.vue';
import BaseSkeleton from 'src/core/components/BaseSkeleton.vue';
withDefaults(defineProps<{ editing?: boolean }>(), { editing: false });
</script>
<style scoped>
.mm-film-skeleton {
  display: grid;
  grid-template-columns: minmax(180px, 280px) minmax(0, 1fr);
  grid-template-rows: auto 1fr;
  gap: 1.5rem clamp(1.5rem, 3vw, 2.5rem);
}
.mm-film-skeleton-poster {
  aspect-ratio: 2/3;
  height: auto !important;
  grid-row: 1/3;
  border-radius: 20px;
}
.mm-film-skeleton-heading,
.mm-film-skeleton-copy {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
}
.mm-film-skeleton-heading {
  padding-top: 0.5rem;
}
.mm-film-skeleton-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0.5rem 0;
}
.mm-film-skeleton-copy {
  align-self: start;
}
.mm-film-skeleton-disclosures {
  display: grid;
  gap: 1.25rem;
  padding-block: 0.4rem;
}
.mm-film-skeleton-links {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.5rem;
}
.mm-film-skeleton-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}
.mm-film-skeleton-fields > div {
  display: grid;
  gap: 0.5rem;
}
.mm-film-skeleton-description {
  grid-column: 1/-1;
}
.mm-film-skeleton-edit {
  grid-template-columns: minmax(180px, 300px) minmax(0, 1fr);
  gap: 1.5rem clamp(1.5rem, 4vw, 4rem);
}
.mm-film-skeleton-reviews {
  border: 1px solid var(--mm-border);
  border-radius: 20px;
  padding: 1.5rem;
  margin-top: 2rem;
  display: grid;
  gap: 1.25rem;
}
.mm-film-skeleton-review {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.mm-film-skeleton-review > :last-child {
  margin-left: auto;
}
@media (max-width: 750px) {
  .mm-film-skeleton {
    grid-template-columns: 120px minmax(0, 1fr);
    gap: 1rem;
  }
  .mm-film-skeleton-poster {
    grid-row: 1;
  }
  .mm-film-skeleton-heading {
    gap: 0.8rem;
  }
  .mm-film-skeleton-copy {
    grid-column: 1/-1;
  }
  .mm-film-skeleton-edit {
    grid-template-columns: 1fr;
  }
  .mm-film-skeleton-edit .mm-film-skeleton-poster {
    width: 120px;
  }
  .mm-film-skeleton-fields {
    grid-template-columns: 1fr;
  }
  .mm-film-skeleton-reviews {
    padding: 1rem;
  }
}
</style>
