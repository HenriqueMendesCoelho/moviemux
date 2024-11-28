export default class User {
  constructor(
    public id = '',
    public name = '',
    public email = '',
    public roles = [''],
    public created_at = new Date(),
    public updated_at = new Date(),
    public preferences = {
      notify: true,
    },
    public statistics = {
      ratings_given: 0,
      registered_movies: 0,
      display_time: 0,
      average_rating_movies: 0,
      consecutive_failed_login_attempts: 0,
      last_login_at: new Date(),
    }
  ) {}
}
