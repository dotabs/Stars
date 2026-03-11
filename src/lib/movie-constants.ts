import { countries as movieCountries } from '@/data/movies';

export const browseGenres = [
  'Action',
  'Adventure',
  'Animation',
  'Comedy',
  'Crime',
  'Documentary',
  'Drama',
  'Family',
  'Fantasy',
  'History',
  'Horror',
  'Mystery',
  'Romance',
  'Sci-Fi',
  'Thriller',
  'War',
  'Western',
];

export const browseDecades = [1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];

export type BrowseCountryOption = {
  label: string;
  code: string;
  aliases: string[];
};

const browseCountryCatalog: Record<string, BrowseCountryOption> = {
  USA: {
    label: 'USA',
    code: 'US',
    aliases: ['usa', 'us', 'united states', 'united states of america'],
  },
  UK: {
    label: 'UK',
    code: 'GB',
    aliases: ['uk', 'gb', 'great britain', 'united kingdom'],
  },
  France: {
    label: 'France',
    code: 'FR',
    aliases: ['france'],
  },
  Germany: {
    label: 'Germany',
    code: 'DE',
    aliases: ['germany'],
  },
  Japan: {
    label: 'Japan',
    code: 'JP',
    aliases: ['japan'],
  },
  'South Korea': {
    label: 'South Korea',
    code: 'KR',
    aliases: ['south korea', 'korea, republic of', 'republic of korea'],
  },
  Spain: {
    label: 'Spain',
    code: 'ES',
    aliases: ['spain'],
  },
  Italy: {
    label: 'Italy',
    code: 'IT',
    aliases: ['italy'],
  },
  Canada: {
    label: 'Canada',
    code: 'CA',
    aliases: ['canada'],
  },
  Australia: {
    label: 'Australia',
    code: 'AU',
    aliases: ['australia'],
  },
  Brazil: {
    label: 'Brazil',
    code: 'BR',
    aliases: ['brazil'],
  },
  'New Zealand': {
    label: 'New Zealand',
    code: 'NZ',
    aliases: ['new zealand'],
  },
};

export const browseCountryOptions = movieCountries
  .map((country) => browseCountryCatalog[country])
  .filter((country): country is BrowseCountryOption => Boolean(country));

export const browseCountries = browseCountryOptions.map((country) => country.label);

export const browseCountryCodeByLabel = Object.fromEntries(
  browseCountryOptions.map((country) => [country.label, country.code]),
) as Record<string, string>;

const browseCountryAliasMap = new Map(
  browseCountryOptions.flatMap((country) => country.aliases.map((alias) => [alias, country.label] as const)),
);

export function normalizeBrowseCountry(value: string) {
  const normalized = value.trim().toLowerCase();
  return browseCountryAliasMap.get(normalized) ?? value.trim();
}

export const browseStreamingPlatforms = [
  { label: 'Netflix', value: '8' },
  { label: 'Amazon Prime', value: '9' },
  { label: 'Hulu', value: '15' },
  { label: 'Disney+', value: '337' },
  { label: 'Apple TV+', value: '350' },
  { label: 'Peacock', value: '386' },
  { label: 'Paramount+', value: '531' },
  { label: 'Max', value: '1899' },
  { label: 'MUBI', value: '11' },
];
