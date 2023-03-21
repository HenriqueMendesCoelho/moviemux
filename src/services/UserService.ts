import axios from 'axios';

import User from '@/domain/user/User';

const BASE_URL = process.env.VUE_APP_KB_CINE_API;
const API_USER = `${BASE_URL}/api/user`;

export default {
  async create(payload: { name: string; email: string; password: string; invite_code: string }) {
    try {
      const res = await axios.post(`${API_USER}`, payload);
      return res.data;
    } catch (error) {
      return Promise.reject(error);
    }
  },
  async getUserAdm(email: string): Promise<User> {
    try {
      const res = await axios.get(`${API_USER}/adm?email=${email}`);
      return res.data;
    } catch (error) {
      return Promise.reject(error);
    }
  },
  async getUser(): Promise<User> {
    try {
      const res = await axios.get(`${API_USER}`);
      return res.data;
    } catch (error) {
      return Promise.reject(error);
    }
  },
};
