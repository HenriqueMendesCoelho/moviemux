export default class Movie {
  constructor(
    public id?: string,
    public tmdb_id?: number,
    public portuguese_title?: string,
    public english_title?: string,
    public original_title?: string,
    public director?: string,
    public url_image?: string,
    public portuguese_url_trailer?: string,
    public english_url_trailer?: string,
    public description?: string,
    public genres?: Array<number>,
    public release_date?: Date
  ) {}
}
