export type Verdict = 'Masterpiece' | 'Essential' | 'Recommended' | 'Mixed' | 'Skip';

export interface Movie {
  id: string;
  source?: 'local' | 'tmdb';
  tmdbId?: number;
  title: string;
  year: number;
  releaseDate?: string;
  genres: string[];
  verdict: Verdict;
  score: number;
  reviewCount?: number;
  popularity?: number;
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
  trailerUrl?: string;
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

export type ViewMode = 'grid' | 'compact' | 'list';

export type SortOption = 'newest' | 'highestRated' | 'mostPopular' | 'releaseDate' | 'mostReviewed';

export type WatchlistTab = 'watchlist' | 'watched' | 'favorites';

export type SearchResultType = 'movie' | 'tv' | 'person';
export type SearchViewType = 'all' | SearchResultType;

export interface SearchResult {
  id: number;
  mediaType: SearchResultType;
  title: string;
  subtitle: string;
  yearLabel?: string;
  metadataLine: string;
  knownForDepartment?: string;
  knownForTitles?: string[];
  imageUrl: string;
  overview: string;
  score?: number;
  popularity: number;
  relevanceScore: number;
}

export interface TvShowSummary {
  id: number;
  title: string;
  yearLabel: string;
  posterUrl: string;
  backdropUrl: string;
  overview: string;
  score: number;
  genres: string[];
}

export interface TvShowDetails extends TvShowSummary {
  firstAirDate?: string;
  lastAirDate?: string;
  seasons: number;
  episodes: number;
  status: string;
  creators: string[];
  networks: string[];
  cast: string[];
}

export interface PersonCredit {
  id: number;
  mediaType: 'movie' | 'tv';
  title: string;
  subtitle: string;
  imageUrl: string;
}

export interface PersonDetails {
  id: number;
  name: string;
  knownForDepartment: string;
  biography: string;
  birthday?: string;
  placeOfBirth: string;
  imageUrl: string;
  backdropUrl: string;
  knownFor: PersonCredit[];
}
