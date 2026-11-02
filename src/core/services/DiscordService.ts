import axios from 'src/core/http';

const BASE_URL = '';
const API_DISCORD = `${BASE_URL}/restricted/discord`;

export default {
  async sendDiscordMessage(movieId: string): Promise<void> {
    await axios.post(`${API_DISCORD}/${movieId}`);
  },
  async updateDiscordMessage(movieId: string): Promise<void> {
    await axios.patch(`${API_DISCORD}/${movieId}`);
  },
};
