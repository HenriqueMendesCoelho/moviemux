import Swal from "sweetalert2";

export default class CustomAlerts {
  // eslint-disable-next-line
  customAlert(title: string, text: string, confirm: boolean, icon: any) {
    return Swal.fire({
      title: title,
      text: text,
      icon: confirm ? "question" : icon,
      allowOutsideClick: false,
      showConfirmButton: true,
      showCancelButton: confirm ? true : false,
      background: "#293244",
      confirmButtonText: confirm ? "Sim" : "OK",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#00f6ff",
      allowEscapeKey: false,
      color: "#f0ffffde",
    });
  }

  // eslint-disable-next-line
  toastAlert(title: string, icon: any) {
    const toast = Swal.mixin({
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      background: "#293244",
      color: "#f0ffffde",
      timer: 3000,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener("mouseenter", Swal.stopTimer);
        toast.addEventListener("mouseleave", Swal.resumeTimer);
      },
    });

    toast.fire({
      title: title,
      icon: icon,
    });
  }

  inputConfirm(title: string, label: string, placeHolder: string) {
    return Swal.fire({
      title: title,
      input: "password",
      inputLabel: label,
      inputPlaceholder: placeHolder,
      cancelButtonText: "Cancelar",
      background: "#293244",
      color: "#f0ffffde",
      showCancelButton: true,
    });
  }
}
