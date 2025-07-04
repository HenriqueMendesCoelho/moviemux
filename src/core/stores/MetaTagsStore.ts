import { defineStore } from 'pinia';
import KitService from 'src/core/services/KitService';

import type { MovieInfoTypeKit } from 'src/core/types/movie/MovieType';

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
        res.title = escapeDoubleQuotes(res.title);
        res.description = escapeDoubleQuotes(res.description);
        this.info = res;

        return Promise.resolve();
      } catch {
        return Promise.reject(Error('Failed to fetch movie info'));
      }
    },
  },
});

function escapeDoubleQuotes(str: string) {
  return str.replace(/"/g, '&quot;');
}
