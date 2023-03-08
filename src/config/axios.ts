import { useUserStore } from '@/stores/UserStore';
import axios from 'axios';

axios.interceptors.request.use(
  (request) => {
    const token = localStorage.getItem('auth-kb');

    if (token) {
      const userStore = useUserStore();
      request.headers['Authorization'] = `Bearer ${token}`;
      userStore.user.isLoged = true;
    }

    return request;
  },
  function (error) {
    return Promise.reject(error);
  }
);

axios.interceptors.response.use((response) => {
  if (response.status === 403) {
    const userStore = useUserStore();
    userStore.showDialogLogin = true;
    userStore.user.isLoged = false;
  }

  return response;
});
