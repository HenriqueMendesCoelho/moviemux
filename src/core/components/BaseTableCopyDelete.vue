<template>
  <section class="mm-table-panel">
    <h3>{{ title }}</h3>
    <div class="mm-table-scroll">
      <table class="mm-table">
        <thead>
          <tr>
            <th
              v-for="column in columns"
              :key="column.name"
              scope="col"
              :aria-sort="
                column.sortable
                  ? sortName === column.name
                    ? descending
                      ? 'descending'
                      : 'ascending'
                    : 'none'
                  : undefined
              "
              :style="alignment(column)"
            >
              <button
                v-if="column.sortable"
                type="button"
                class="mm-sort-header"
                @click="toggleSort(column)"
              >
                {{ column.label
                }}<span aria-hidden="true">{{
                  sortName === column.name ? (descending ? ' ↓' : ' ↑') : ' ↕'
                }}</span>
              </button>
              <template v-else>{{ column.label }}</template>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in sortedRows" :key="index">
            <td v-for="column in columns" :key="column.name" :style="alignment(column)">
              <div v-if="column.name === 'actions'" class="mm-actions">
                <button
                  type="button"
                  class="mm-button mm-button-ghost"
                  aria-label="Copiar"
                  @click="emit('copy', row)"
                >
                  Copiar</button
                ><button
                  type="button"
                  class="mm-button mm-button-danger"
                  aria-label="Excluir"
                  @click="emit('delete', row)"
                >
                  Excluir
                </button>
              </div>
              <template v-else>{{ cell(row, column) }}</template>
            </td>
          </tr>
          <tr v-if="!rows.length">
            <td :colspan="columns?.length || 1" class="mm-empty">Nenhum resultado encontrado.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
<script setup lang="ts" generic="T extends object">
import { computed, ref } from 'vue';
type Column = {
  name: string;
  label: string;
  field?: string | ((row: T) => unknown);
  format?: (value: unknown, row: T) => unknown;
  align?: string;
  sortable?: boolean;
  sort?: (a: unknown, b: unknown, rowA: T, rowB: T) => number;
};
const props = defineProps<{ title: string; columns?: Column[]; rows: T[] }>();
const sortName = ref(''),
  descending = ref(false);
function raw(row: T, column: Column) {
  return typeof column.field === 'function'
    ? column.field(row)
    : (row as Record<string, unknown>)[column.field || column.name];
}
function toggleSort(column: Column) {
  if (sortName.value !== column.name) {
    sortName.value = column.name;
    descending.value = false;
  } else if (!descending.value) descending.value = true;
  else {
    sortName.value = '';
    descending.value = false;
  }
}
function alignment(column: Column) {
  const value = column.align;
  return {
    textAlign:
      value === 'right'
        ? ('right' as const)
        : value === 'center'
          ? ('center' as const)
          : ('left' as const),
  };
}
const sortedRows = computed(() => {
  const column = props.columns?.find((item) => item.name === sortName.value);
  if (!column) return props.rows;
  return props.rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const av = raw(a.row, column),
        bv = raw(b.row, column);
      let result = column.sort
        ? column.sort(av, bv, a.row, b.row)
        : av == null
          ? bv == null
            ? 0
            : -1
          : bv == null
            ? 1
            : typeof av === 'number' && typeof bv === 'number'
              ? av - bv
              : String(av).localeCompare(String(bv), 'pt-BR', {
                  numeric: true,
                  sensitivity: 'base',
                });
      if (descending.value) result = -result;
      return result || a.index - b.index;
    })
    .map((entry) => entry.row);
});
const emit = defineEmits<{ copy: [value: T]; delete: [value: T] }>();
function cell(row: T, column: Column) {
  const value =
    typeof column.field === 'function'
      ? column.field(row)
      : (row as Record<string, unknown>)[column.field || column.name];
  return column.format ? column.format(value, row) : value;
}
</script>
<style scoped>
.mm-sort-header {
  color: inherit;
  font: inherit;
  font-weight: inherit;
  text-align: inherit;
  width: 100%;
  padding: 0;
}
.mm-table-scroll {
  overflow: auto;
  max-height: 350px;
}
.mm-table {
  width: 100%;
  border-collapse: collapse;
}
.mm-table th,
.mm-table td {
  text-align: left;
  padding: 12px;
  border-bottom: 1px solid var(--grey-mid);
}
.mm-table th {
  position: sticky;
  top: 0;
  background: var(--grey-dark2);
}
</style>
