import axios from 'axios';

const BASE_URL = process.env.VUE_APP_KB_CINE_API;
const API_USER = `${BASE_URL}/api/user`;

export default {
  async create(payload: { name: string; email: string; password: string; invite_code: string }) {
    try {
      await axios.post(`${API_USER}`, payload);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  },
};
