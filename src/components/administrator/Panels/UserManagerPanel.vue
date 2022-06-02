<template>
    <div id="container-access" class="div-container">
        <div class="div-panel">
            <h2>Gerencimento de conta de usuário</h2>
            <div class="textfield textfield-access">
                <label for="email">E-mail usuário alvo</label>
                <input type="text" name="email" placeholder="Digite..." />
            </div>
            <div class="textfield-buttons textfield-buttons-access">
                <button
                    class="btn btn-success"
                    type="submit"
                    @click="apiCall('add_admin')"
                >
                    Promover administrador
                </button>
                <button
                    class="btn btn-danger"
                    type="submit"
                    @click="apiCall('rmv_admin')"
                >
                    Revogar administrador
                </button>
            </div>
            <div class="textfield-buttons textfield-buttons-access">
                <button
                    class="btn btn-danger"
                    type="submit"
                    @click="apiCall('delete')"
                >
                    Deletar usuário
                </button>
            </div>
            <div
                class="textfield-buttons textfield-buttons-access"
                @click="apiCall('block')"
            >
                <button class="btn btn-warning input" type="submit">
                    Bloquear usuário
                </button>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import CustomAlerts from "@/domain/alerts/CustomAlerts";
import testService from "@/components/services/testService";
import { defineComponent } from "vue-demi";

export default defineComponent({
    data() {
        return {
            customAlert: new CustomAlerts(),
        };
    },
    methods: {
        apiCall(type: string) {
            let phrase1 = "";
            let phrase2 = "";

            if (type == "block") {
                phrase1 = "Confirma o bloqueio";
                phrase2 = "bloqueado";
            } else if (type == "delete") {
                phrase1 = "Confirma a exclusão";
                phrase2 = "excluído";
            } else if (type == "add_admin") {
                phrase1 = "Confirma a promoção";
                phrase2 = "promovido";
            } else if (type == "rmv_admin") {
                phrase1 = "Confirma o rebaixamento";
                phrase2 = "rebaixado";
            }

            this.customAlert
                .customAlert("", phrase1 + " do usuário ?", true, "")
                .then((result) => {
                    if (result.isConfirmed) {
                        this.customAlert
                            .inputConfirm(
                                "Insira a sua senha",
                                "Senha",
                                "Insira a senha..."
                            )
                            .then((result) => {
                                if (!result.dismiss) {
                                    //INSERT API CODE
                                    result.value ==
                                    "123" /*INSERT API VALIDATION*/
                                        ? this.customAlert.toastAlert(
                                              "Usuário " + phrase2,
                                              "success"
                                          )
                                        : this.customAlert.customAlert(
                                              "Senha incorreta",
                                              "",
                                              false,
                                              "error"
                                          );
                                }
                            });
                    }
                });
        },
        async randomNumber() {
            return testService
                .randomNumber()
                .then((res) => {
                    return "KB-" + res;
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
@import "@/components/administrator/SCSS/AdministratorPanel.scss";
</style>
