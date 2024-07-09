import { defineStore } from 'pinia';
import KitService from 'src/services/KitService';

import type { MovieInfoTypeKit } from 'src/types/movie/MovieType';

export const useMetaTagsStore = defineStore('MetaTagsStore', {
  state: () => {
    return {
      info: {} as MovieInfoTypeKit,
    };
  },
  actions: {
    async getMovieInfo(tmdbId: number): Promise<void> {
      try {
        const res = await KitService.info({ tmdb_id: tmdbId });
        this.info = res;

        return Promise.resolve();
      } catch {
        return Promise.reject();
      }
    },
  },
});
