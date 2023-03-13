import Movie from '@/domain/movie/movie';
import { defineStore } from 'pinia';

export const useMovieStore = defineStore('MovieStore', {
  state: () => {
    return {
      moviePage: {
        id: '',
        isEditing: false,
        selectedMovie: new Movie(),
        showImportMovieDialog: false,
      },

      allMovies: [
        {
          id: 1,
          titulo: 'X-MEN',
          url: 'https://i.pinimg.com/564x/39/b1/e2/39b1e25ff4d10111ce777fa8f0fb35c4.jpg',
          note: 8.6,
        },
        {
          id: 2,
          titulo: 'Vingadores: Guerra Infinita',
          url: 'https://i.pinimg.com/564x/e9/2d/fc/e92dfc153392babc282f9da35470c835.jpg',
          note: 4.2,
        },
        {
          id: 3,
          titulo: 'Friends with Benefits',
          url: 'https://i.pinimg.com/564x/fc/b1/02/fcb102c9a43165e9c665892d1c9af070.jpg',
          note: 6.7,
        },
        {
          id: 4,
          titulo: 'Aliens',
          url: 'https://i.pinimg.com/564x/b6/f7/41/b6f741e84097a01a809a179aa4c57843.jpg',
          note: 7.2,
        },
        {
          id: 5,
          titulo: 'Rambo First Blood',
          url: 'https://i.pinimg.com/564x/ff/5e/66/ff5e66073290ccca3af13c8b7301dca6.jpg',
          note: 2.2,
        },
        {
          id: 6,
          titulo: 'Dunkirk',
          url: 'https://i.pinimg.com/564x/aa/26/9b/aa269bf3f8e4ae370c95ec1ff6c23b00.jpg',
          note: 9.1,
        },
        {
          id: 7,
          titulo: 'Toretto',
          url: 'https://i.pinimg.com/564x/f6/d4/69/f6d469ebccf005908fc33999d8430ba6.jpg',
          note: 5.1,
        },
        {
          id: 8,
          titulo: 'Professor and the Madman',
          url: 'https://i.pinimg.com/564x/e3/ba/87/e3ba8722d5cde587d5eaad9eb65628ca.jpg',
          note: 7.5,
        },
        {
          id: 9,
          titulo: 'Professor and the Madman',
          url: 'https://i.pinimg.com/564x/e3/ba/87/e3ba8722d5cde587d5eaad9eb65628ca.jpg',
          note: 7.5,
        },
        {
          id: 10,
          titulo: 'Professor and the Madman',
          url: 'https://i.pinimg.com/564x/e3/ba/87/e3ba8722d5cde587d5eaad9eb65628ca.jpg',
          note: 7.5,
        },
        {
          id: 11,
          titulo: 'Professor and the Madman',
          url: 'https://i.pinimg.com/564x/e3/ba/87/e3ba8722d5cde587d5eaad9eb65628ca.jpg',
          note: 7.5,
        },
        {
          id: 12,
          titulo: 'Professor and the Madman',
          url: 'https://i.pinimg.com/564x/e3/ba/87/e3ba8722d5cde587d5eaad9eb65628ca.jpg',
          note: 7.5,
        },
        {
          id: 13,
          titulo: 'Professor and the Madman',
          url: 'https://media.fstatic.com/x5p3n0eeoWdJlbDpXd0_ZaJo1cw=/290x478/smart/media/movies/covers/2022/02/no_exit_ver2.jpg',
          note: 7.5,
        },
        {
          id: 14,
          titulo: 'Professor and the Madman',
          url: 'https://i.pinimg.com/564x/e3/ba/87/e3ba8722d5cde587d5eaad9eb65628ca.jpg',
          note: 7.5,
        },
        {
          id: 15,
          titulo: 'Deep Water',
          url: 'https://i.imgur.com/FyuYAxi.jpg',
          note: 4.9,
        },
        {
          id: 16,
          titulo: 'Professor and the Madman',
          url: 'https://i.pinimg.com/564x/e3/ba/87/e3ba8722d5cde587d5eaad9eb65628ca.jpg',
          note: 7.5,
        },
        {
          id: 17,
          titulo: 'Professor and the Madman',
          url: 'https://i.pinimg.com/564x/e3/ba/87/e3ba8722d5cde587d5eaad9eb65628ca.jpg',
          note: 7.5,
        },
        {
          id: 18,
          titulo: 'Professor and the Madman',
          url: 'https://i.pinimg.com/564x/e3/ba/87/e3ba8722d5cde587d5eaad9eb65628ca.jpg',
          note: 7.5,
        },
        {
          id: 19,
          titulo: 'Amogus',
          url: 'https://gifs.eco.br/wp-content/uploads/2022/06/gifs-de-among-us-0.gif',
          note: 10,
        },
      ],
    };
  },
  actions: {
    resetStoreMovie() {
      this.moviePage.selectedMovie = new Movie();
    },
  },
});
