<template>
  <section class="mm-form" :aria-busy="busy">
    <h2>Convide novas histórias.</h2>
    <p class="mm-muted">Gere um código para permitir a criação de uma conta.</p>
    <div class="mm-actions">
      <button class="mm-btn mm-btn-primary" :disabled="busy" @click="createInvite">
        Gerar convite</button
      ><button class="mm-btn" :disabled="busy" @click="loadInvites">Atualizar</button>
    </div>
    <label v-if="invite" class="mm-field"
      >Último convite gerado<input
        :value="invite"
        readonly
        @focus="($event.target as HTMLInputElement).select()"
    /></label>
    <p v-if="error" class="mm-error" role="alert">{{ error }}</p>
    <div class="mm-table-wrap">
      <table class="mm-table">
        <caption class="mm-sr-only">
          Convites disponíveis
        </caption>
        <thead>
          <tr>
            <th>Código</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in pagedRows" :key="row.code">
            <td class="mm-invite-code">{{ row.code }}</td>
            <td>
              <div class="mm-actions">
                <button class="mm-btn" :disabled="busy" @click="copy(row.code)">Copiar</button
                ><button
                  class="mm-btn mm-btn-danger"
                  :disabled="busy"
                  @click="deleteInvite(row.code)"
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
        >Página {{ page }} de {{ pageCount }} · {{ invites.length }} registros</span
      >
      <button class="mm-btn" :disabled="page >= pageCount" @click="page++">Próxima</button>
    </nav>
    <p v-if="!busy && !invites.length" class="mm-muted">Nenhum convite disponível.</p>
  </section>
</template>
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import UserService from 'src/core/services/UserService';
import { showSuccess } from 'src/core/utils/NotificationUtils';
const invites = ref<{ code: string }[]>([]);
const invite = ref('');
const busy = ref(false);
const error = ref('');
const page = ref(1);
const pageSize = 20;
const pageCount = computed(() => Math.max(1, Math.ceil(invites.value.length / pageSize)));
const pagedRows = computed(() =>
  invites.value.slice((page.value - 1) * pageSize, page.value * pageSize),
);
watch(pageCount, (count) => {
  page.value = Math.min(page.value, count);
});
onMounted(loadInvites);
async function loadInvites() {
  if (busy.value) return;
  busy.value = true;
  error.value = '';
  try {
    invites.value = await UserService.listUserInvites();
  } catch {
    error.value = 'Não foi possível carregar os convites.';
  } finally {
    busy.value = false;
  }
}
async function createInvite() {
  if (busy.value) return;
  busy.value = true;
  error.value = '';
  try {
    const result = await UserService.createUserInvite();
    invite.value = result.code;
    // Creation is already successful even if refreshing the list fails.
    if (!invites.value.some((item) => item.code === result.code))
      invites.value = [result, ...invites.value];
    showSuccess('Convite criado.');
    try {
      invites.value = await UserService.listUserInvites();
    } catch {
      error.value =
        'Convite criado. Não foi possível atualizar a lista; o código acima pode ser utilizado.';
    }
  } catch {
    error.value = 'Não foi possível criar o convite.';
  } finally {
    busy.value = false;
  }
}
async function deleteInvite(code: string) {
  if (busy.value || !window.confirm('Excluir este convite? Ele não poderá mais ser utilizado.'))
    return;
  busy.value = true;
  error.value = '';
  try {
    await UserService.deleteUserInvite(code);
    invites.value = invites.value.filter((item) => item.code !== code);
    if (invite.value === code) invite.value = '';
    showSuccess('Convite excluído.');
  } catch {
    error.value = 'Não foi possível excluir o convite.';
  } finally {
    busy.value = false;
  }
}
async function copy(code: string) {
  try {
    await navigator.clipboard.writeText(code);
    showSuccess('Convite copiado.');
  } catch {
    error.value = 'O navegador bloqueou a cópia. Selecione e copie o código manualmente.';
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
.mm-invite-code {
  overflow-wrap: anywhere;
  max-width: 35rem;
}
</style>
