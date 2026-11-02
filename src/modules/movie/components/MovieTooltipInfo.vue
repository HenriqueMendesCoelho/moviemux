<template>
  <details class="mm-movie-info">
    <summary>Sobre este cadastro</summary>
    <p>Cadastrado por {{ movie.user_name || 'Usuário desconhecido' }}</p>
    <p>Criado em {{ movie.created_at ? DateUtils.toLocaleString(movie.created_at) : '—' }}</p>
    <p>Atualizado em {{ movie.updated_at ? DateUtils.toLocaleString(movie.updated_at) : '—' }}</p>
  </details>
</template>
<script setup lang="ts">
import { useMovieContext } from '../composables/useMovieContext';
import DateUtils from 'src/core/utils/DateUtils';
const movie = useMovieContext();
</script>
<style scoped>
.mm-movie-info {
  font-size: 0.8rem;
  line-height: 1.7;
  margin: 1rem 0;
  opacity: 0.75;
}
.mm-movie-info summary {
  cursor: pointer;
}
</style>
