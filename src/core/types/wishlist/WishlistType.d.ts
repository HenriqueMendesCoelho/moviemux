export type WishlistType = {
  id: string;
  name: string;
  shareable: boolean;
  movies_wishlists: {
    tmdb_id: number;
    title?: string;
    title_english: string;
    url_image: string;
    release_date: Date;
  }[];
  created_at: Date;
  updated_at: Date;
  user: {
    id: string;
    name: string;
  };
};
