<template>
  <section class="mm-form" :aria-busy="busy">
    <h2>Todos os usuários</h2>
    <div class="mm-actions">
      <label class="mm-field"
        >Filtrar<input v-model.trim="filter" type="search" placeholder="Nome ou e-mail" /></label
      ><button class="mm-btn" :disabled="busy" @click="load">Atualizar</button>
    </div>
    <p v-if="error" role="alert" class="mm-error">{{ error }}</p>
    <div class="mm-table-wrap">
      <table class="mm-table">
        <caption class="mm-sr-only">
          Usuários cadastrados
        </caption>
        <thead>
          <tr>
            <th>Nome</th>
            <th>E-mail</th>
            <th>Perfis</th>
            <th>Criado em</th>
            <th>Atualizado em</th>
            <th>Último acesso</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in pagedRows" :key="user.id">
            <td>{{ user.name }}</td>
            <td>{{ user.email }}</td>
            <td>{{ user.roles.join(', ') }}</td>
            <td>{{ formatDate(user.created_at) }}</td>
            <td>{{ formatDate(user.updated_at) }}</td>
            <td>{{ formatDate(user.statistics?.last_login_at) }}</td>
            <td>
              <div class="mm-actions">
                <button class="mm-btn" @click="copy(user.email)">Copiar e-mail</button
                ><button
                  class="mm-btn mm-btn-danger"
                  :disabled="busy || user.id === store.user.id"
                  @click="remove(user)"
                >
                  Excluir
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <nav class="mm-actions mm-pagination" aria-label="Paginação">
      <button class="mm-btn" :disabled="page <= 1" @click="page--">Anterior</button>
      <span role="status"
        >Página {{ page }} de {{ pageCount }} · {{ visibleUsers.length }} registros</span
      >
      <button class="mm-btn" :disabled="page >= pageCount" @click="page++">Próxima</button>
    </nav>
    <p v-if="!busy && !visibleUsers.length" class="mm-muted">Nenhum usuário encontrado.</p>
  </section>
</template>
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import type User from 'src/core/domain/user/User';
import UserService from 'src/core/services/UserService';
import { useUserStore } from 'src/core/stores/UserStore';
import { showSuccess } from 'src/core/utils/NotificationUtils';
const users = ref<User[]>([]);
const busy = ref(false);
const error = ref('');
const filter = ref('');
const store = useUserStore();
const visibleUsers = computed(() =>
  users.value.filter((user) =>
    `${user.name} ${user.email}`.toLocaleLowerCase().includes(filter.value.toLocaleLowerCase()),
  ),
);
const page = ref(1);
const pageSize = 20;
const pageCount = computed(() => Math.max(1, Math.ceil(visibleUsers.value.length / pageSize)));
const pagedRows = computed(() =>
  visibleUsers.value.slice((page.value - 1) * pageSize, page.value * pageSize),
);
watch(pageCount, (count) => {
  page.value = Math.min(page.value, count);
});
watch(filter, () => {
  page.value = 1;
});
onMounted(load);
function formatDate(value?: Date | string) {
  return value ? new Date(value).toLocaleString('pt-BR') : 'Não registrado';
}
async function load() {
  if (busy.value) return;
  busy.value = true;
  error.value = '';
  try {
    users.value = await UserService.listUsersAdm();
  } catch {
    error.value = 'Não foi possível carregar os usuários.';
  } finally {
    busy.value = false;
  }
}
async function copy(email: string) {
  try {
    await navigator.clipboard.writeText(email);
    showSuccess('E-mail copiado.');
  } catch {
    error.value = 'Não foi possível copiar. Selecione o e-mail manualmente.';
  }
}
async function remove(user: User) {
  if (
    busy.value ||
    user.id === store.user.id ||
    !window.confirm(`Excluir o usuário ${user.name} (${user.email})?`)
  )
    return;
  busy.value = true;
  error.value = '';
  try {
    await UserService.deleteUser(user.id);
    users.value = users.value.filter((item) => item.id !== user.id);
    showSuccess('Usuário excluído.');
  } catch {
    error.value = 'Não foi possível excluir o usuário.';
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.mm-table-wrap {
  max-height: 36rem;
  overflow: auto;
}
.mm-pagination {
  flex-wrap: wrap;
}
</style>
