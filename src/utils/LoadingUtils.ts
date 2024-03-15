import { Loading } from 'quasar';

export function showLoading() {
  Loading.show();
}
export function hideLoading() {
  Loading.hide();
}
export function showLoadingWithMessage(message: string) {
  Loading.show({
    message: message,
  });
}
