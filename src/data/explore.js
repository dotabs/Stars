import { movies } from '@/data/movies';
import { countryCatalog, countryCatalogByGlobeName, countryCatalogByKey } from '@/lib/country-catalog';
function getTopGenres(countryMovies) {
    const genreMap = new Map();
    for (const movie of countryMovies) {
        for (const genre of movie.genres ?? []) {
            genreMap.set(genre, (genreMap.get(genre) ?? 0) + 1);
        }
    }
    return [...genreMap.entries()]
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .map(([genre, count]) => ({ genre, count }));
}
function buildCountryStat(entry, countryMovies) {
    const rankedMovies = [...countryMovies].sort((left, right) => right.score - left.score || right.year - left.year);
    const genreCounts = getTopGenres(rankedMovies);
    const averageScore = rankedMovies.length === 0
        ? 0
        : Number((rankedMovies.reduce((total, movie) => total + movie.score, 0) / rankedMovies.length).toFixed(1));
    return {
        key: entry.key,
        label: entry.label,
        globeName: entry.globeName,
        flag: entry.flag,
        region: entry.region,
        filmCount: rankedMovies.length,
        averageScore,
        topGenres: genreCounts.slice(0, 4).map(({ genre }) => genre),
        genreCounts,
        topFilms: rankedMovies.slice(0, 5),
        posterFilms: rankedMovies.slice(0, 4),
        movies: [...rankedMovies].sort((left, right) => right.year - left.year || right.score - left.score),
        explored: false,
        totalPoolResults: rankedMovies.length,
        source: 'local',
        standoutTitles: rankedMovies.slice(0, 4).map((movie) => movie.title),
    };
}
function buildBootstrapExploreCountries() {
    const grouped = new Map();
    for (const movie of movies) {
        const existing = grouped.get(movie.country) ?? [];
        existing.push(movie);
        grouped.set(movie.country, existing);
    }
    return countryCatalog
        .map((entry) => buildCountryStat(entry, grouped.get(entry.key) ?? []))
        .sort((left, right) => right.filmCount - left.filmCount || left.label.localeCompare(right.label));
}
export const exploreCountries = buildBootstrapExploreCountries();
export const exploreCountryByKey = new Map(exploreCountries.map((country) => [country.key, country]));
export const exploreCountryByGlobeName = new Map(exploreCountries.map((country) => [country.globeName, country]));
export const exploreCatalogByKey = countryCatalogByKey;
export const exploreCatalogByGlobeName = countryCatalogByGlobeName;
export const featuredExploreCountries = exploreCountries;
export const defaultExploreCountry = exploreCountryByKey.get('Japan') ?? featuredExploreCountries[0] ?? exploreCountries[0];
export const defaultPinnedCountryKeys = ['Japan', 'France', 'Brazil'];
