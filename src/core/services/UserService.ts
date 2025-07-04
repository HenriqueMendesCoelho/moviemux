import axios from 'axios';

import type User from 'src/core/domain/user/User';

import StringUtils from 'src/core/utils/StringUtils';

const BASE_URL = process.env.VUE_APP_KB_CINE_API;
const API_USER = `${BASE_URL}/user`;
const API_USER_PUBLIC = `${BASE_URL}/public/user`;
const API_USER_RESTRICTED = `${BASE_URL}/restricted/user`;
const API_USER_INVITE_RESTRICTED = `${BASE_URL}/restricted/user/invite`;

export default {
  async create(payload: { name: string; email: string; password: string; invite_code: string }) {
    const res = await axios.post(`${API_USER_PUBLIC}`, payload);

    return res.data;
  },
  async getUserAdm(email: string): Promise<User> {
    const res = await axios.get(`${API_USER_RESTRICTED}/${email}`);

    return res.data;
  },
  async getUser(): Promise<User> {
    const res = await axios.get(`${API_USER}`);

    return res.data;
  },
  async updateUserProfile(payload: {
    name: string;
    email: string;
    notify: boolean;
  }): Promise<User> {
    const params = StringUtils.getStringParams(payload);
    const res = await axios.patch(`${API_USER}/update`, params);

    return res.data;
  },
  async updateUserPassword(payload: { password: string; newPassword: string }): Promise<User> {
    const params = StringUtils.getStringParams(payload);
    const res = await axios.patch(`${API_USER}/p/update`, params);

    return res.data;
  },
  async promoteUser(userId: string): Promise<User> {
    const res = await axios.patch(`${API_USER_RESTRICTED}/${userId}/promote`);

    return res.data;
  },
  async demoteUser(userId: string): Promise<User> {
    const res = await axios.patch(`${API_USER_RESTRICTED}/${userId}/demote`);

    return res.data;
  },
  async blockUser(userId: string): Promise<User> {
    const res = await axios.patch(`${API_USER_RESTRICTED}/${userId}/block`);

    return res.data;
  },
  async deleteUser(userId: string): Promise<User> {
    const res = await axios.delete(`${API_USER_RESTRICTED}/${userId}`);

    return res.data;
  },
  async listUsersAdm(): Promise<User[]> {
    const res = await axios.get(`${API_USER_RESTRICTED}`);

    return res.data;
  },
  //User PasswordRedefineKey
  async createRedefinePassowordKey(email: string): Promise<void> {
    await axios.post(`${API_USER_PUBLIC}/password/reset`, { email: email });
  },
  async redefinePasswordByKey(
    key: string,
    request: { email: string; password: string },
  ): Promise<void> {
    await axios.post(`${API_USER_PUBLIC}/password/${key}/reset`, request);
  },
  //User Invites
  async listUserInvites(): Promise<{ code: string }[]> {
    const res = await axios.get(`${API_USER_INVITE_RESTRICTED}`);

    return res.data;
  },
  async createUserInvite(): Promise<{ code: string }> {
    const res = await axios.post(`${API_USER_INVITE_RESTRICTED}`);

    return res.data;
  },
  async deleteUserInvite(code: string): Promise<void> {
    const res = await axios.delete(`${API_USER_INVITE_RESTRICTED}/${code}/delete`);

    return res.data;
  },
};
