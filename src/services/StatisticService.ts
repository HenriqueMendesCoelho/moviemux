import axios from 'axios';
import { MovieStatistics } from 'src/types/statistics/Statistics';

const BASE_URL = process.env.VUE_APP_KB_CINE_API;
const API_STATISTICS = `${BASE_URL}/api/statistic`;

export default {
  async movies(): Promise<MovieStatistics> {
    try {
      const res = await axios.get(`${API_STATISTICS}/movies`);
      return Promise.resolve(res.data);
    } catch (error) {
      return Promise.reject(error);
    }
  },
};
