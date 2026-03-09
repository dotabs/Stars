import type { Movie } from '@/types';
import { movies } from '@/data/movies';

interface CountryCatalogEntry {
  key: string;
  label: string;
  globeName: string;
  flag: string;
  region: string;
}

export interface ExploreFilm extends Movie {
  posterAccent?: string;
}

export interface ExploreCountryStat {
  key: string;
  label: string;
  globeName: string;
  flag: string;
  region: string;
  filmCount: number;
  averageScore: number;
  topGenres: string[];
  genreCounts: Array<{ genre: string; count: number }>;
  topFilms: ExploreFilm[];
  posterFilms: ExploreFilm[];
  movies: ExploreFilm[];
  explored: boolean;
}

const countryCatalog: Record<string, CountryCatalogEntry> = {
  USA: {
    key: 'USA',
    label: 'United States',
    globeName: 'United States of America',
    flag: 'US',
    region: 'North America',
  },
  UK: {
    key: 'UK',
    label: 'United Kingdom',
    globeName: 'United Kingdom',
    flag: 'UK',
    region: 'Europe',
  },
  France: {
    key: 'France',
    label: 'France',
    globeName: 'France',
    flag: 'FR',
    region: 'Europe',
  },
  Germany: {
    key: 'Germany',
    label: 'Germany',
    globeName: 'Germany',
    flag: 'DE',
    region: 'Europe',
  },
  Italy: {
    key: 'Italy',
    label: 'Italy',
    globeName: 'Italy',
    flag: 'IT',
    region: 'Europe',
  },
  Spain: {
    key: 'Spain',
    label: 'Spain',
    globeName: 'Spain',
    flag: 'ES',
    region: 'Europe',
  },
  Japan: {
    key: 'Japan',
    label: 'Japan',
    globeName: 'Japan',
    flag: 'JP',
    region: 'Asia',
  },
  'South Korea': {
    key: 'South Korea',
    label: 'South Korea',
    globeName: 'South Korea',
    flag: 'KR',
    region: 'Asia',
  },
  China: {
    key: 'China',
    label: 'China',
    globeName: 'China',
    flag: 'CN',
    region: 'Asia',
  },
  India: {
    key: 'India',
    label: 'India',
    globeName: 'India',
    flag: 'IN',
    region: 'Asia',
  },
  Brazil: {
    key: 'Brazil',
    label: 'Brazil',
    globeName: 'Brazil',
    flag: 'BR',
    region: 'South America',
  },
  Australia: {
    key: 'Australia',
    label: 'Australia',
    globeName: 'Australia',
    flag: 'AU',
    region: 'Oceania',
  },
  Canada: {
    key: 'Canada',
    label: 'Canada',
    globeName: 'Canada',
    flag: 'CA',
    region: 'North America',
  },
  Mexico: {
    key: 'Mexico',
    label: 'Mexico',
    globeName: 'Mexico',
    flag: 'MX',
    region: 'North America',
  },
  Russia: {
    key: 'Russia',
    label: 'Russia',
    globeName: 'Russia',
    flag: 'RU',
    region: 'Europe / Asia',
  },
  'New Zealand': {
    key: 'New Zealand',
    label: 'New Zealand',
    globeName: 'New Zealand',
    flag: 'NZ',
    region: 'Oceania',
  },
};

const exploredCountryKeys = new Set([
  'USA',
  'Japan',
  'France',
  'South Korea',
  'Italy',
  'Australia',
  'UK',
]);

function enrichMovie(movie: Movie): ExploreFilm {
  return movie;
}

function getTopGenres(countryMovies: ExploreFilm[]) {
  const genreMap = new Map<string, number>();

  for (const movie of countryMovies) {
    for (const genre of movie.genres) {
      genreMap.set(genre, (genreMap.get(genre) ?? 0) + 1);
    }
  }

  return [...genreMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([genre, count]) => ({ genre, count }));
}

function buildCountryStats() {
  const grouped = new Map<string, ExploreFilm[]>();

  for (const movie of movies) {
    const catalogEntry = countryCatalog[movie.country];
    if (!catalogEntry) continue;

    const existing = grouped.get(catalogEntry.key) ?? [];
    existing.push(enrichMovie(movie));
    grouped.set(catalogEntry.key, existing);
  }

  return Object.values(countryCatalog)
    .map((entry): ExploreCountryStat => {
      const countryMovies = (grouped.get(entry.key) ?? []).sort((a, b) => b.score - a.score);
      const genreCounts = getTopGenres(countryMovies);
      const averageScore =
        countryMovies.length === 0
          ? 0
          : Number(
              (
                countryMovies.reduce((total, movie) => total + movie.score, 0) /
                countryMovies.length
              ).toFixed(1),
            );

      return {
        ...entry,
        filmCount: countryMovies.length,
        averageScore,
        topGenres: genreCounts.slice(0, 3).map(({ genre }) => genre),
        genreCounts,
        topFilms: [...countryMovies].slice(0, 5),
        posterFilms: [...countryMovies].slice(0, 4),
        movies: [...countryMovies].sort((a, b) => b.year - a.year || b.score - a.score),
        explored: exploredCountryKeys.has(entry.key),
      };
    })
    .sort((a, b) => b.filmCount - a.filmCount || a.label.localeCompare(b.label));
}

export const exploreCountries = buildCountryStats();

export const exploreCountryByKey = new Map(
  exploreCountries.map((country) => [country.key, country] as const),
);

export const exploreCountryByGlobeName = new Map(
  exploreCountries.map((country) => [country.globeName, country] as const),
);

export const featuredExploreCountries = exploreCountries.filter((country) => country.filmCount > 0);

export const defaultExploreCountry =
  exploreCountryByKey.get('Japan') ?? featuredExploreCountries[0] ?? exploreCountries[0];

export const defaultPinnedCountryKeys = ['USA', 'Japan', 'UK'];
