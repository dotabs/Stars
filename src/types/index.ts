export type Verdict = 'Masterpiece' | 'Essential' | 'Recommended' | 'Mixed' | 'Skip';

export interface Movie {
  id: string;
  title: string;
  year: number;
  genres: string[];
  verdict: Verdict;
  score: number;
  poster: string;
  backdrop?: string;
  director: string;
  cast: string[];
  runtime: number;
  synopsis: string;
  country: string;
  language: string;
  streaming?: string[];
  decade: number;
}

export interface Review {
  id: string;
  movieId: string;
  author: string;
  date: string;
  summary: string;
  pros: string[];
  cons: string[];
  sections: {
    story: string;
    performances: string;
    direction: string;
    visuals: string;
    sound: string;
    themes: string;
  };
  scoreBreakdown: {
    story: number;
    performances: number;
    direction: number;
    visuals: number;
    sound: number;
  };
}

export interface MovieList {
  id: string;
  title: string;
  description: string;
  author: string;
  movieIds: string[];
  followers: number;
}

export interface Actor {
  id: string;
  name: string;
  birthYear: number;
  nationality: string;
  bio: string;
  image: string;
  knownFor: string[];
  awards: string[];
  movieIds: string[];
}

export type ViewMode = 'grid' | 'compact';

export type SortOption = 'newest' | 'topRated' | 'popular' | 'oldest';

export type WatchlistTab = 'watchlist' | 'watched' | 'favorites';
