import axios from 'src/core/http';
import type { MovieStatistics } from 'src/core/types/statistics/Statistics';

const BASE_URL = '';
const API_STATISTICS = `${BASE_URL}/statistic`;

export default {
  async movies(): Promise<MovieStatistics> {
    const res = await axios.get(`${API_STATISTICS}/movies`);

    return res.data;
  },
};
