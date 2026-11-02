/** Local, deterministic QA fixtures only. Never deploy this server or use its tokens in production. */
import { createServer } from 'node:http';
const port = Number(process.env.QA_API_PORT || 3001);
const origin = `http://127.0.0.1:${port}`;
const now = new Date().toISOString();
const fixtureCount = Math.max(8, Math.min(120, Number(process.env.QA_MOVIE_COUNT) || 8));
const summaryDelay = Math.max(0, Math.min(5000, Number(process.env.QA_SUMMARY_DELAY_MS) || 0));
const creditsDelay = Math.max(0, Math.min(5000, Number(process.env.QA_CREDITS_DELAY_MS) || 0));
const ratingCount = Math.max(
  1,
  Math.min(50, Number(process.env.QA_RATING_COUNT) || (fixtureCount > 8 ? 2 : 1)),
);
const genres = [
  { id: 1, name: 'Ficção científica', tmdb_id: 878 },
  { id: 2, name: 'Drama', tmdb_id: 18 },
  { id: 3, name: 'Aventura', tmdb_id: 12 },
];
if (fixtureCount > 8) {
  [
    'Ação',
    'Animação',
    'Comédia',
    'Crime',
    'Documentário',
    'Família',
    'Fantasia',
    'História',
    'Terror',
    'Música',
    'Mistério',
    'Romance',
    'Suspense',
    'Guerra',
    'Faroeste',
  ].forEach((name, index) => {
    genres.push({ id: index + 4, name, tmdb_id: index + 1000 });
  });
}
const titles = [
  'Além do horizonte',
  'A última órbita',
  'Dias de verão',
  'O silêncio da cidade',
  'Entre estrelas',
  'Maré alta',
  'Depois da meia-noite',
  'O mapa do amanhã',
];
const movies = Array.from({ length: fixtureCount }, (_, i) => ({
  title: titles[i % titles.length]! + (i >= titles.length ? ` · ${i + 1}` : ''),
  i,
})).map(({ title, i }) => ({
  id: `movie-${i + 1}`,
  tmdb_id: 100 + i,
  imdb_id: `tt10000${i}`,
  portuguese_title: title,
  english_title: title,
  original_title: title,
  director: 'Direção de demonstração',
  url_image: `${origin}/poster/${i}`,
  portuguese_url_trailer: '',
  english_url_trailer: '',
  description:
    'Uma história sobre encontros, descobertas e os caminhos que escolhemos. Dados fictícios para validar a interface e os fluxos do MovieMux.',
  genres: [genres[i % genres.length]],
  release_date: '2025-06-15',
  runtime: 115 + i,
  notes: [
    {
      note: 8 + (i % 2),
      createdAt: now,
      updatedAt: now,
      user: { id: 'qa-user', name: 'Conta de demonstração' },
    },
  ],
  user_id: 'qa-user',
  user_name: 'Conta de demonstração',
  created_at: now,
  updated_at: now,
  show_notes: true,
  time_since_creation: i,
}));
for (const movie of movies) {
  for (let index = 1; index < ratingCount; index++) {
    movie.notes.push({
      note: index % 11,
      createdAt: now,
      updatedAt: now,
      user: { id: `qa-companion-${index}`, name: `Colega de sessão ${index}` },
    });
  }
}
const user = {
  id: 'qa-user',
  name: 'Conta de demonstração',
  email: 'demo@moviemux.test',
  roles: ['ADM', 'USER'],
  created_at: now,
  updated_at: now,
  preferences: { notify: true },
  statistics: {
    ratings_given: 42,
    registered_movies: 18,
    display_time: 4200,
    average_rating_movies: 8.2,
    consecutive_failed_login_attempts: 0,
    last_login_at: now,
  },
};
const lists = [
  {
    id: 'list-1',
    name: 'Para o próximo fim de semana',
    shareable: true,
    movies_wishlists: movies.slice(0, 4).map((m) => ({
      tmdb_id: m.tmdb_id,
      title: m.portuguese_title,
      title_english: m.english_title,
      url_image: m.url_image,
      release_date: m.release_date,
    })),
    created_at: now,
    updated_at: now,
    user: { id: user.id, name: user.name },
  },
];
let invites = [{ code: 'MOVIEMUX-DEMO' }];
const token = (actor = user) =>
  `${Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: actor.email, id: actor.id, name: actor.name, aud: ['https://www.moviemux.com/api'], roles: actor.roles, exp: Math.floor(Date.now() / 1000) + 86400 })).toString('base64url')}.qa-fixture-not-a-real-signature`;
const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  const url = new URL(req.url || '/', origin);
  const path = url.pathname;
  if (/\/poster\/\d+$/.test(path)) {
    const index = Number(path.split('/').at(-1)) % titles.length;
    const colors = [
      '#234967',
      '#633a50',
      '#bd783b',
      '#343c5c',
      '#306459',
      '#47717b',
      '#40334f',
      '#755a37',
    ];
    res.setHeader('Content-Type', 'image/svg+xml');
    res.end(
      `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="750" viewBox="0 0 500 750"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="${colors[index]}"/><stop offset="1" stop-color="#0b101c"/></linearGradient></defs><rect width="500" height="750" fill="url(#g)"/><circle cx="${140 + index * 20}" cy="280" r="145" fill="#ffffff12"/><path d="M0 650L230 340 500 600V750H0Z" fill="#0005"/><path d="M0 700L350 420 500 560V750H0Z" fill="#0004"/><text x="40" y="70" fill="#fff8" font-family="sans-serif" font-size="14" letter-spacing="5">MOVIEMUX · DEMONSTRAÇÃO</text><text x="40" y="580" fill="white" font-family="sans-serif" font-weight="bold" font-size="32">${titles[index]}</text><text x="40" y="625" fill="#fff9" font-family="sans-serif" font-size="17">Uma história para guardar.</text><text x="40" y="700" fill="#00f6ff" font-family="sans-serif" font-size="14" letter-spacing="4">2025 · CINEMA</text></svg>`,
    );
    return;
  }
  let raw = '';
  for await (const chunk of req) raw += chunk;
  let body: Record<string, unknown> = {};
  if (raw) {
    try {
      body = JSON.parse(raw);
    } catch {
      body = Object.fromEntries(new URLSearchParams(raw));
    }
  }
  let data: unknown = {};
  if (path === '/login')
    data = {
      access_token: token(
        typeof body.email === 'string' && body.email.endsWith('@ssr.test')
          ? {
              ...user,
              id: body.email,
              email: body.email,
              name: body.email.split('@')[0]!,
              roles: body.email.startsWith('Admin') ? ['ADM', 'USER'] : ['USER'],
            }
          : user,
      ),
      expires: new Date(Date.now() + 86400000).toISOString(),
    };
  else if (path === '/qa/token')
    data = { token: token(), warning: 'Local QA fixture only; not valid for any real backend' };
  else if (path === '/movie/genres' || path === '/movie/genres-with-movies') data = genres;
  else if (path === '/statistic/movies')
    data = {
      total_number_of_movies: 42,
      average_rate: 8.2,
      average_runtime: 123,
      movies_by_gender: { Drama: 16, 'Ficção científica': 12, Aventura: 8, Comédia: 6 },
      movies_six_months_ago: { Maio: 4, Junho: 8, Julho: 6, Agosto: 10, Setembro: 7, Outubro: 7 },
    };
  else if (path.includes('/credits')) {
    if (creditsDelay) await new Promise((resolve) => setTimeout(resolve, creditsDelay));
    data = {
      cast: Array.from({ length: 18 }, (_, index) => ({
        id: index + 1,
        name: `Pessoa fictícia ${index + 1}`,
        original_name: `Pessoa fictícia ${index + 1}`,
        known_for_department: 'Acting',
        character: index ? 'Participação de demonstração' : 'Protagonista',
        profile_path:
          index % 3 === 0 ? null : index % 3 === 1 ? '/missing-person.jpg' : `/poster/${index}`,
      })),
      crew: Array.from({ length: 8 }, (_, index) => ({
        id: index + 101,
        name: `Equipe fictícia ${index + 1}`,
        original_name: `Equipe fictícia ${index + 1}`,
        known_for_department: 'Directing',
        department: 'Directing',
        job: 'Director',
        profile_path: index % 2 ? '/missing-person.jpg' : null,
      })),
    };
  } else if (path.includes('/watch-providers'))
    data = { id: 100, results: { BR: { link: 'https://www.themoviedb.org/', flatrate: [] } } };
  else if (path.endsWith('/summary')) {
    if (summaryDelay) await new Promise((resolve) => setTimeout(resolve, summaryDelay));
    const m = movies.find((m) => path.includes(String(m.tmdb_id))) || movies[0]!;
    data = {
      ...m,
      url_image_portuguese: m.url_image,
      url_image_english: m.url_image,
      genres: m.genres.map((g) => g!.name),
    };
  } else if (path.endsWith('/info')) {
    const m = movies[0]!;
    data = { title: m.portuguese_title, description: m.description, url_image: '' };
  } else if (path.startsWith('/movie/tmdb'))
    data = {
      page: Number(url.searchParams.get('page') || 1),
      total_pages: 1,
      total_results: movies.length,
      results: movies.map((m) => ({
        id: m.tmdb_id,
        title: m.portuguese_title,
        original_title: m.original_title,
        poster_path: `/poster/${m.tmdb_id - 100}`,
        backdrop_path: '',
        overview: m.description,
        release_date: m.release_date,
        vote_average: 8.4,
        vote_count: 152,
        genre_ids: [878],
      })),
    };
  else if (path === '/restricted/user/invite') {
    if (req.method === 'POST') {
      const invite = { code: `DEMO-${invites.length + 1}` };
      invites.push(invite);
      data = invite;
    } else data = invites;
  } else if (path.startsWith('/restricted/user/invite/')) {
    invites = invites.filter((i) => !path.includes(i.code));
    data = {};
  } else if (path === '/restricted/user')
    data = [
      user,
      {
        ...user,
        id: 'qa-other',
        name: 'Outro cinéfilo',
        email: 'other@moviemux.test',
        roles: ['USER'],
      },
    ];
  else if (path.startsWith('/restricted/user/'))
    data = { ...user, email: decodeURIComponent(path.split('/')[3] || user.email) };
  else if (path === '/user' || path.startsWith('/user/update')) {
    if (req.method === 'PATCH') Object.assign(user, body);
    data = user;
  } else if (path === '/user/wishlist') {
    if (req.method === 'POST') {
      const list = {
        ...lists[0]!,
        id: `list-${lists.length + 1}`,
        name: String(body.name || 'Nova lista'),
        movies_wishlists: [],
      };
      lists.push(list);
      data = list;
    } else data = lists;
  } else if (path.startsWith('/user/wishlist/')) {
    const id = path.split('/')[3];
    const index = lists.findIndex((l) => l.id === id);
    const list = lists[index];
    if (path.endsWith('/movies-rated')) data = { movie_tmdb_ids: [100] };
    else if (req.method === 'DELETE') {
      if (index >= 0) lists.splice(index, 1);
      data = {};
    } else if (req.method === 'PUT') {
      if (list) Object.assign(list, body);
      data = list;
    } else if (req.method === 'PATCH') {
      const m = movies.find((m) => m.tmdb_id === Number(body.tmdbId));
      if (list && m && !list.movies_wishlists.some((x) => x.tmdb_id === m.tmdb_id))
        list.movies_wishlists.push({
          tmdb_id: m.tmdb_id,
          title: m.portuguese_title,
          title_english: m.english_title,
          url_image: m.url_image,
          release_date: m.release_date,
        });
      data = list;
    } else data = list;
  } else if (path.startsWith('/movie/note')) {
    const id = String(body.movie_id || path.split('/')[3]);
    const m = movies.find((m) => m.id === id) || movies[0]!;
    if (req.method === 'DELETE') m.notes = [];
    else if (req.method !== 'GET')
      m.notes = [
        {
          note: Number(body.note),
          createdAt: now,
          updatedAt: now,
          user: { id: user.id, name: user.name },
        },
      ];
    data = m.notes;
  } else if (path === '/movie') {
    if (req.method === 'POST') {
      const m = { ...movies[0]!, ...body, id: `movie-${movies.length + 1}` };
      movies.push(m as (typeof movies)[number]);
      data = m;
    } else {
      const query = (url.searchParams.get('title') || '').toLowerCase();
      const found = movies.filter((m) => m.portuguese_title.toLowerCase().includes(query));
      const pageNumber = Math.max(1, Number(url.searchParams.get('page')) || 1);
      const pageSize = Math.max(1, Math.min(120, Number(url.searchParams.get('size')) || 30));
      data = {
        content: found.slice((pageNumber - 1) * pageSize, pageNumber * pageSize),
        total_elements: found.length,
        total_pages: Math.ceil(found.length / pageSize),
        number: pageNumber - 1,
        size: pageSize,
        last: pageNumber * pageSize >= found.length,
        first: pageNumber === 1,
        empty: !found.length,
      };
    }
  } else if (path.startsWith('/movie/')) {
    const id = path.split('/')[2];
    const m = movies.find((m) => m.id === id);
    if (req.method === 'PUT' && m) Object.assign(m, body);
    data = m || movies[0];
  } else if (req.method === 'GET') {
    res.statusCode = 404;
    data = { message: `Unimplemented QA fixture: ${path}` };
  }
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
});
server.listen(port, '0.0.0.0', () =>
  console.log(`MovieMux QA API (fictional data only): ${origin}`),
);
