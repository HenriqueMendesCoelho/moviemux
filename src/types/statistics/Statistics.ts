type MoviesByGenre = {
  [genre: string]: number;
};

type MoviesSixMonthsAgo = {
  [month: string]: number;
};

export type MovieStatistics = {
  total_number_of_movies: number;
  average_rate: number;
  average_runtime: number;
  movies_by_gender: MoviesByGenre;
  movies_six_months_ago: MoviesSixMonthsAgo;
};
