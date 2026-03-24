# PRESENTATION EXTRA NOTES

## Hosting / Deployment
- Hosting is set up for Vercel.
- Evidence from the codebase:
  - `vercel.json` has SPA rewrites and security headers.
  - `README.md` has a Vercel deployment section.
  - The app is built with Vite using `npm run build`.
- What this means in simple English:
  - The React frontend can be deployed to Vercel.
  - Vercel serves the built app and rewrites routes back to `/` so React Router works on refresh.
- Firebase is also set up as the backend service.
  - `firebase.json` points to `firestore.rules` and `storage.rules`.
  - Firestore and Storage are configured for user data and profile assets.
- Simple presentation line:
  - "The frontend is prepared for Vercel deployment, and Firebase handles the backend services like auth, database, and storage."

## D: Login / Profile / Watchlist / Firebase
- Challenge:
  - User account features are spread across login state, profile data, watchlists, favorites, watched history, and reviews.
  - That can become hard to keep consistent across many pages.
- Solution:
  - The app centralizes auth in `AuthProvider` and centralizes Firebase data logic in shared files like `social.js`, `user-library.js`, and `movie-feedback.js`.
  - When a user signs in, the app makes sure their Firestore profile exists, and library/profile counts stay in sync.
- Simple presentation line:
  - "One challenge was keeping all user data consistent, so the project uses shared Firebase helper layers instead of handling account logic separately on every page."

## J: Explore / Movie Details / API Integration
- Challenge:
  - TMDB returns raw API data, but the UI needs clean movie, TV, person, and discovery objects.
  - The app also needs to combine live TMDB content with Firebase user data on detail pages.
- Solution:
  - The project uses shared TMDB helper files like `tmdb.js`, `tmdb-movies.js`, `tmdb-search.js`, and `explore-discovery.js` to transform raw API responses into UI-ready data.
  - On the Review page, TMDB movie details are combined with Firebase reviews and library state in one screen.
- Simple presentation line:
  - "A big challenge was combining live TMDB content with app-specific user data, so the project separates API-fetching and data-mapping into reusable helper files."

## N: Home / Browse / Lists
- Challenge:
  - These pages all need large amounts of movie data, but they each use it differently.
  - Home needs curated sections, Browse needs filters and search, and Lists needs ranked collections with load-more behavior.
- Solution:
  - The project uses shared movie data helpers in `tmdb-movies.js`, then each page applies its own UI logic on top.
  - Browse also saves session state and scroll position so users can return without losing their place.
- Simple presentation line:
  - "The challenge here was giving each page a different discovery experience without duplicating logic, so shared TMDB helpers power Home, Browse, and Lists in different ways."
