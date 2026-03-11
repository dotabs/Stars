export {
  browseCountries,
  browseCountryCodeByLabel,
  browseCountryOptions,
  normalizeBrowseCountry,
  type CountryCatalogEntry,
} from '@/lib/country-catalog';

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
