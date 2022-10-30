<template>
  <div id="container-access" class="div-container">
    <div class="div-panel">
      <h3>Gerencimento de conta de usuário</h3>
      <div class="textfield textfield-access">
        <label for="email">E-mail usuário alvo</label>
        <input type="text" name="email" placeholder="Digite..." />
      </div>
      <div class="textfield-buttons textfield-buttons-access">
        <q-btn
          class="btn"
          color="positive"
          label="Promover administrador"
          type="submit"
          @click="apiCall('add_admin')"
        />
        <q-btn
          class="btn btn-danger"
          type="submit"
          color="negative"
          label="Revogar administrador"
          @click="apiCall('rmv_admin')"
        />
      </div>
      <div class="textfield-buttons textfield-buttons-access">
        <q-btn
          class="btn btn-danger"
          type="submit"
          color="negative"
          label="Deletar usuário"
          @click="apiCall('delete')"
        />
      </div>
      <div class="textfield-buttons textfield-buttons-access" @click="apiCall('block')">
        <q-btn class="btn btn-warning input" color="warning" label="Bloquear usuário" type="submit" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import CustomAlerts from '@/domain/alerts/CustomAlerts';
import TestService from '@/services/TestService';
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'UserManagerPanel',
  data() {
    return {
      customAlert: new CustomAlerts(),
    };
  },
  methods: {
    apiCall(type: string) {
      let phrase1 = '';
      let phrase2 = '';

      if (type == 'block') {
        phrase1 = 'Confirma o bloqueio';
        phrase2 = 'bloqueado';
      } else if (type == 'delete') {
        phrase1 = 'Confirma a exclusão';
        phrase2 = 'excluído';
      } else if (type == 'add_admin') {
        phrase1 = 'Confirma a promoção';
        phrase2 = 'promovido';
      } else if (type == 'rmv_admin') {
        phrase1 = 'Confirma o rebaixamento';
        phrase2 = 'rebaixado';
      }

      this.customAlert.customAlert('', phrase1 + ' do usuário ?', true, '').then((result) => {
        if (result.isConfirmed) {
          this.customAlert.inputConfirm('Insira a sua senha', 'Senha', 'Insira a senha...').then((result) => {
            if (!result.dismiss) {
              //INSERT API CODE
              result.value == '123' /*INSERT API VALIDATION*/
                ? this.customAlert.toastAlert('Usuário ' + phrase2, 'success')
                : this.customAlert.customAlert('Senha incorreta', '', false, 'error');
            }
          });
        }
      });
    },
    async randomNumber() {
      return TestService.randomNumber()
        .then((res) => {
          return 'KB-' + res;
        })
        .catch((err) => {
          console.log(err);
          return;
        });
    },
  },
});
</script>

<style lang="scss" scoped>
@import '@/components/administrator/scss/AdministratorPanel.scss';
</style>
