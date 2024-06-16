import axios from 'axios';

const BASE_URL = process.env.VUE_APP_KB_CINE_API;
const API_DISCORD = `${BASE_URL}/restricted/discord`;

export default {
  async sendDiscordMessage(movieId: string): Promise<void> {
    try {
      await axios.post(`${API_DISCORD}/${movieId}`);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  },
  async updateDiscordMessage(movieId: string): Promise<void> {
    try {
      await axios.patch(`${API_DISCORD}/${movieId}`);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  },
};
