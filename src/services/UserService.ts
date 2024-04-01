import axios from 'axios';

import User from 'src/domain/user/User';

import StringUtils from 'src/utils/StringUtils';

const BASE_URL = process.env.VUE_APP_KB_CINE_API;
const API_USER = `${BASE_URL}/api/user`;

export default {
  async create(payload: { name: string; email: string; password: string; invite_code: string }) {
    try {
      const res = await axios.post(`${API_USER}`, payload);
      return Promise.resolve(res.data);
    } catch (error) {
      return Promise.reject(error);
    }
  },
  async getUserAdm(email: string): Promise<User> {
    try {
      const res = await axios.get(`${API_USER}/adm?email=${email}`);
      return Promise.resolve(res.data);
    } catch (error) {
      return Promise.reject(error);
    }
  },
  async getUser(): Promise<User> {
    try {
      const res = await axios.get(`${API_USER}`);
      return Promise.resolve(res.data);
    } catch (error) {
      return Promise.reject(error);
    }
  },
  async updateUserProfile(payload: { name: string; email: string; notify: boolean }): Promise<User> {
    const params = StringUtils.getStringParams(payload);
    try {
      const res = await axios.patch(`${API_USER}/update`, params);
      return Promise.resolve(res.data);
    } catch (error) {
      return Promise.reject(error);
    }
  },
  async updateUserPassword(payload: { password: string; newPassword: string }): Promise<User> {
    const params = StringUtils.getStringParams(payload);
    try {
      const res = await axios.patch(`${API_USER}/p/update`, params);
      return Promise.resolve(res.data);
    } catch (error) {
      return Promise.reject(error);
    }
  },
  async promoteUser(userId: string): Promise<User> {
    try {
      const res = await axios.patch(`${API_USER}/${userId}/promote`);
      return Promise.resolve(res.data);
    } catch (error) {
      return Promise.reject(error);
    }
  },
  async demoteUser(userId: string): Promise<User> {
    try {
      const res = await axios.patch(`${API_USER}/${userId}/demote`);
      return Promise.resolve(res.data);
    } catch (error) {
      return Promise.reject(error);
    }
  },
  async blockUser(userId: string): Promise<User> {
    try {
      const res = await axios.patch(`${API_USER}/${userId}/block`);
      return Promise.resolve(res.data);
    } catch (error) {
      return Promise.reject(error);
    }
  },
  async deleteUser(userId: string): Promise<User> {
    try {
      const res = await axios.delete(`${API_USER}/${userId}`);
      return Promise.resolve(res.data);
    } catch (error) {
      return Promise.reject(error);
    }
  },
  async listUsersAdm(): Promise<User[]> {
    try {
      const res = await axios.get(`${API_USER}/adm/list`);
      return Promise.resolve(res.data);
    } catch (error) {
      return Promise.reject(error);
    }
  },
  //User PasswordRedefineKey
  async createRedefinePassowordKey(email: string): Promise<void> {
    try {
      await axios.post(`${API_USER}/password/reset`, { email: email });
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  },
  async redefinePasswordByKey(key: string, request: { email: string; password: string }): Promise<void> {
    try {
      await axios.post(`${API_USER}/password/${key}/reset`, request);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  },
  //User Invites
  async listUserInvites(): Promise<{ code: string }[]> {
    try {
      const res = await axios.get(`${API_USER}/invite`);
      return Promise.resolve(res.data);
    } catch (error) {
      return Promise.reject(error);
    }
  },
  async createUserInvite(): Promise<{ code: string }> {
    try {
      const res = await axios.post(`${API_USER}/invite`);
      return Promise.resolve(res.data);
    } catch (error) {
      return Promise.reject(error);
    }
  },
  async deleteUserInvite(code: string): Promise<void> {
    try {
      const res = await axios.delete(`${API_USER}/invite/${code}/delete`);
      return Promise.resolve(res.data);
    } catch (error) {
      return Promise.reject(error);
    }
  },
};
