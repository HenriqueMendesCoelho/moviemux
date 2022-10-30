import Movie from '@/domain/movie/Movie';
import { defineStore } from 'pinia';

export const useMovieStore = defineStore('MovieStore', {
  state: () => {
    return {
      selectedMovie: new Movie(),
      allMovies: [
        {
          id: 1,
          titulo: 'X-MEN',
          url: 'https://i.pinimg.com/564x/39/b1/e2/39b1e25ff4d10111ce777fa8f0fb35c4.jpg',
        },
        {
          id: 2,
          titulo: 'Jpolin',
          url: 'https://i.pinimg.com/564x/e9/2d/fc/e92dfc153392babc282f9da35470c835.jpg',
        },
        {
          id: 3,
          titulo: 'Friends with...',
          url: 'https://i.pinimg.com/564x/fc/b1/02/fcb102c9a43165e9c665892d1c9af070.jpg',
        },
        {
          id: 4,
          titulo: 'Aliens',
          url: 'https://i.pinimg.com/564x/b6/f7/41/b6f741e84097a01a809a179aa4c57843.jpg',
        },
        {
          id: 5,
          titulo: 'Rambo first...',
          url: 'https://i.pinimg.com/564x/ff/5e/66/ff5e66073290ccca3af13c8b7301dca6.jpg',
        },
        {
          id: 6,
          titulo: 'dunkirk',
          url: 'https://i.pinimg.com/564x/aa/26/9b/aa269bf3f8e4ae370c95ec1ff6c23b00.jpg',
        },
        {
          id: 7,
          titulo: 'Toretto',
          url: 'https://i.pinimg.com/564x/f6/d4/69/f6d469ebccf005908fc33999d8430ba6.jpg',
        },
        {
          id: 8,
          titulo: 'Professor an...',
          url: 'https://i.pinimg.com/564x/e3/ba/87/e3ba8722d5cde587d5eaad9eb65628ca.jpg',
        },
        {
          id: 9,
          titulo: 'Professor an...',
          url: 'https://i.pinimg.com/564x/e3/ba/87/e3ba8722d5cde587d5eaad9eb65628ca.jpg',
        },
        {
          id: 10,
          titulo: 'Professor an...',
          url: 'https://i.pinimg.com/564x/e3/ba/87/e3ba8722d5cde587d5eaad9eb65628ca.jpg',
        },
        {
          id: 11,
          titulo: 'Professor an...',
          url: 'https://i.pinimg.com/564x/e3/ba/87/e3ba8722d5cde587d5eaad9eb65628ca.jpg',
        },
        {
          id: 12,
          titulo: 'Professor an...',
          url: 'https://i.pinimg.com/564x/e3/ba/87/e3ba8722d5cde587d5eaad9eb65628ca.jpg',
        },
        {
          id: 13,
          titulo: 'Professor an...',
          url: 'https://media.fstatic.com/x5p3n0eeoWdJlbDpXd0_ZaJo1cw=/290x478/smart/media/movies/covers/2022/02/no_exit_ver2.jpg',
        },
        {
          id: 14,
          titulo: 'Professor an...',
          url: 'https://i.pinimg.com/564x/e3/ba/87/e3ba8722d5cde587d5eaad9eb65628ca.jpg',
        },
        {
          id: 15,
          titulo: 'Professor an...',
          url: 'https://i.imgur.com/FyuYAxi.jpg',
        },
        {
          id: 16,
          titulo: 'Professor an...',
          url: 'https://i.pinimg.com/564x/e3/ba/87/e3ba8722d5cde587d5eaad9eb65628ca.jpg',
        },
        {
          id: 17,
          titulo: 'Professor an...',
          url: 'https://i.pinimg.com/564x/e3/ba/87/e3ba8722d5cde587d5eaad9eb65628ca.jpg',
        },
        {
          id: 18,
          titulo: 'Professor an...',
          url: 'https://i.pinimg.com/564x/e3/ba/87/e3ba8722d5cde587d5eaad9eb65628ca.jpg',
        },
      ],
    };
  },
  actions: {
    resetStoreMovie() {
      this.selectedMovie = new Movie();
    },
    getMovieById(id: number) {
      this.allMovies.find((m) => m.id === id);
    },
  },
});