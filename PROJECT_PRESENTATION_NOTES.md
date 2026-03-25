# PROJECT PRESENTATION NOTES

## Project Summary
- STARS is a movie discovery app that mixes live TMDB movie data with Firebase-powered user features.
- TMDB is used for public content like movies, TV shows, people, posters, search, collections, and discovery feeds.
- Firebase is used for account features like login, profile data, watchlists, favorites, reviews, follows, notifications, and messages.

## Login / Auth

### Where login and signup are handled
- Login page: `src/pages/Login.jsx`
- Signup page: `src/pages/Signup.jsx`
- Shared Firebase auth functions: `src/lib/firebase.js`
- Shared auth context/provider: `src/components/auth/AuthContext.jsx`

### How Firebase Authentication is used
- `signUpWithEmail()` in `src/lib/firebase.js` uses Firebase `createUserWithEmailAndPassword`.
- `logInWithEmail()` uses Firebase `signInWithEmailAndPassword`.
- `logOut()` uses Firebase `signOut`.
- Signup also calls `updateProfile()` to save the display name in Firebase Auth.
- Auth persistence is set with `browserLocalPersistence`, so users stay signed in between visits.

### How user session/state is managed
- `AuthProvider` in `src/components/auth/AuthContext.jsx` subscribes to Firebase auth changes with `onAuthStateChanged`.
- The current signed-in user is stored in React context as `currentUser`.
- The app also exposes:
  - `authReady`
  - `isAuthenticated`
  - `refreshCurrentUser()`
  - `updateCurrentUser()`
- When auth changes, the app also calls `ensureUserProfile()` so every signed-in user has a matching Firestore profile document.
- The whole app is wrapped with `AuthProvider` in `src/main.jsx`.

## Profile / Watchlist / User Data

### Where profile data is stored
- Main profile documents are stored in Firestore collection: `userProfiles`
- Public profile handle mapping is stored in: `userProfileHandles`
- Main profile logic is in `src/lib/social.js`
- Profile page UI is in `src/pages/Profile.jsx`

### Where watchlist, favorites, and reviews are stored
- Watchlist / watched / favorites:
  - Firestore collection: `userLibraries`
  - One document per user
  - Managed in `src/lib/user-library.js`
- Reviews:
  - Firestore collection: `movieFeedback/{movieId}/entries/{userId}`
  - Managed in `src/lib/movie-feedback.js`
- Profile review references:
  - Firestore subcollection: `userProfiles/{userId}/reviews`
  - Used so profile pages can quickly load a user’s recent reviews

### Which Firebase services are used
- Firebase Authentication
  - login, signup, session state, password updates
- Firestore
  - profiles
  - user libraries
  - reviews
  - followers / following / follow requests
  - notifications
  - conversations and messages
- Firebase Storage
  - profile avatar uploads

### Main functions used to save/read user data

#### Auth
- `signUpWithEmail()`
- `logInWithEmail()`
- `logOut()`
- `subscribeToAuthState()`

#### Profile
- `ensureUserProfile()`
- `getUserProfile()`
- `updateUserProfile()`
- `syncProfileIdentityReferences()`
- `syncUserProfileStats()`

#### Library
- `readUserLibrarySnapshot()`
- `subscribeToUserLibrary()`
- `setLibraryItemState()`
- `toggleLibraryItem()`
- `removeLibraryItem()`

#### Reviews
- `subscribeToMovieFeedback()`
- `saveMovieFeedback()`
- `loadProfileReviewEntries()`

#### Social
- `requestOrFollowUser()`
- `unfollowUser()`
- `listFollowRequests()`
- `respondToFollowRequest()`
- `listRelationships()`
- `listNotifications()`
- `markNotificationsRead()`
- `listConversations()`
- `listMessages()`
- `sendDirectMessage()`

## Explore / Movie Details / API

### Where TMDB API calls are made
- Base TMDB request helper: `src/lib/tmdb.js`
- Movie discovery and movie detail helpers: `src/lib/tmdb-movies.js`
- Search / TV / person helpers: `src/lib/tmdb-search.js`
- Explore page country discovery helper: `src/lib/explore-discovery.js`

### Which pages use TMDB data
- Home: `src/pages/Home.jsx`
- Browse: `src/pages/Browse.jsx`
- Lists: `src/pages/Lists.jsx`
- Explore: `src/pages/Explore.jsx`
- Review/movie details: `src/pages/Review.jsx`
- TV details: `src/pages/TvShow.jsx`
- Person details: `src/pages/Person.jsx`
- Search results: `src/pages/SearchResults.jsx`
- Watchlist and Profile also re-load TMDB movie data for saved items

### Example TMDB endpoints being used
- Movie discovery and charts:
  - `/trending/movie/week`
  - `/trending/movie/day`
  - `/movie/now_playing`
  - `/movie/upcoming`
  - `/movie/top_rated`
  - `/movie/popular`
  - `/discover/movie`
- Movie details:
  - `/movie/{id}`
  - `/movie/{id}/watch/providers`
  - `/movie/{id}/similar`
- Search:
  - `/search/movie`
  - `/search/multi`
  - `/search/person`
- TV:
  - `/tv/{id}`
  - `/tv/{id}/watch/providers`
- People:
  - `/person/{id}`
- Genres / languages:
  - `/genre/movie/list`
  - `/configuration/languages`

### How movie/person/details data flows into the UI
- Low-level requests start in `tmdbFetch()` inside `src/lib/tmdb.js`.
- Page-specific helper files shape raw TMDB responses into UI-friendly objects.
- Example flow for a movie detail page:
  1. `Review.jsx` gets the route id.
  2. It calls `fetchTmdbMovieByRouteId()` from `src/lib/tmdb-movies.js`.
  3. That helper fetches movie details, credits, videos, recommendations, similar titles, and watch providers.
  4. The helper maps the TMDB response into the movie object used by the UI.
  5. `Review.jsx` renders that movie data and combines it with Firebase review/library data.
- Example flow for search:
  1. Search pages/hooks call `searchGlobal()` from `src/lib/tmdb-search.js`.
  2. TMDB `/search/multi` results are converted into movie, TV, and person cards.
  3. Pages render those normalized results with shared search result components.

## Home / Browse / Lists

### Home
- File: `src/pages/Home.jsx`
- What it does:
  - Loads the main landing page feed
  - Shows a featured hero movie
  - Shows rows like trending, in theaters, popular, top rated, and upcoming
  - Personalizes one recommendation row based on the user’s saved movies
- Main logic:
  - Calls `fetchHomeFeed()`
  - Rotates hero movies on a timer
  - Uses the current user library to rank lightweight recommendations
- How data is fetched and rendered:
  - TMDB feed data is fetched through `src/lib/tmdb-movies.js`
  - Saved watchlist actions go to Firebase through `toggleLibraryItem()`

### Browse
- File: `src/pages/Browse.jsx`
- What it does:
  - Full catalog browsing page with filters, sorting, and search
  - Can also show global search results for movies, TV, and people
- Main logic:
  - Loads language options and trending movies
  - Builds a browse query object from filters
  - Calls `fetchBrowseMovies()`
  - Uses `useGlobalSearch()` when a search query is active
- How data is fetched and rendered:
  - TMDB browse results come from `fetchBrowseMovies()`
  - Search results come from `searchGlobal()`
  - Watchlist/favorites buttons update Firebase user library data

### Lists
- File: `src/pages/Lists.jsx`
- What it does:
  - Shows curated TMDB collections and ranked lists
  - Opens a detail view for one selected collection
- Main logic:
  - Loads preview collections with `fetchTmdbCollections()`
  - Loads more collection pages with `fetchTmdbCollectionPage()`
  - Dedupes repeated titles when paging
- How data is fetched and rendered:
  - TMDB collection helpers supply movie cards
  - Save-to-watchlist actions go to Firebase

## Important Features

### Load more / pagination
- Browse page:
  - Loads more TMDB pages with `handleLoadMore()`
  - Also uses incremental rendering with an `IntersectionObserver`
- Lists page:
  - Loads more items in a collection with `fetchTmdbCollectionPage()`
  - Also auto-loads more when the sentinel enters view
- Notifications page:
  - Uses `listNotifications()` with `cursor`
- Profile connections page:
  - Uses `listRelationships()` with `cursor`
- Messages:
  - Conversations and message lists are paged in the data layer, even though the page currently loads the first chunk

### Search
- Global search hook: `src/hooks/use-global-search.js`
- Search page: `src/pages/SearchResults.jsx`
- Browse page also uses the same global search hook when search text is active
- Search uses TMDB `/search/multi`
- Results are grouped/filterable by:
  - all
  - movies
  - TV shows
  - people

### Filters
- Browse page has the strongest filter system:
  - genres
  - languages
  - verdicts
  - decades
  - streaming services
  - rating
  - year range
  - exact year
  - runtime
  - director
  - cast
  - sort options
- Explore page also has:
  - country selection
  - shelf selection
  - genre filtering inside the current country shelf
- Watchlist page has:
  - tab filtering
  - sort
  - genre
  - runtime
  - rating

### Scroll restore / back navigation behavior
- `src/App.jsx`
  - On normal route changes, the app scrolls to the top
  - On browser back/forward (`POP` navigation), it does not force-scroll
- `src/pages/Browse.jsx`
  - Saves browse state and scroll position in `sessionStorage`
  - Restores filters, results, and scroll position when returning from a detail page
- `src/pages/Review.jsx`
  - Back button uses `navigate(-1)` if possible
  - Falls back to `/browse` if there is no browser history
  - Escape key also returns back/into browse

### Social or advanced features
- Follow system
  - followers
  - following
  - follow requests for private profiles
- Privacy controls
  - profile visibility
  - who can message
  - reviews visibility
  - lists visibility
  - activity visibility
- Direct messaging
  - Firestore conversations and messages
- Notifications
  - new follower
  - follow request
  - follow accepted
  - new message
- Review system
  - per-movie ratings and text reviews
  - live feedback subscription with Firestore `onSnapshot`
- Avatar upload support
  - Firebase Storage upload flow exists in `src/lib/social.js`
- Explore page has a more advanced discovery system
  - country pools
  - pinning countries
  - visited countries
  - recent-movie avoidance so the lineup feels fresher

## Project Structure

### Important folders
- `src/pages`
  - top-level pages and route screens
- `src/lib`
  - main business logic
  - Firebase helpers
  - TMDB helpers
  - social/profile/library logic
- `src/hooks`
  - reusable state/data hooks
- `src/components`
  - shared UI and auth components
- `src/data`
  - local fallback/demo movie data and explore country data
- `public`
  - static assets

### Key files to understand for presentation
- `src/App.jsx`
  - routing and app shell
- `src/main.jsx`
  - app bootstrapping and providers
- `src/lib/firebase.js`
  - Firebase setup and auth helpers
- `src/components/auth/AuthContext.jsx`
  - shared user session state
- `src/lib/social.js`
  - profiles, follows, notifications, messages, avatars
- `src/lib/user-library.js`
  - watchlist / watched / favorites storage
- `src/lib/movie-feedback.js`
  - user reviews and ratings
- `src/lib/tmdb.js`
  - base TMDB request layer
- `src/lib/tmdb-movies.js`
  - movie browse/home/lists/detail data
- `src/lib/tmdb-search.js`
  - search, TV, and person data
- `src/lib/explore-discovery.js`
  - country-based discovery logic
- `src/pages/Home.jsx`
- `src/pages/Browse.jsx`
- `src/pages/Lists.jsx`
- `src/pages/Explore.jsx`
- `src/pages/Review.jsx`
- `src/pages/Profile.jsx`
- `src/pages/Watchlist.jsx`

## Problems Solved / Good Talking Points

### Technical decisions
- TMDB and Firebase responsibilities are clearly separated.
  - TMDB handles public movie/TV/person content.
  - Firebase handles user-specific and social data.
- The app uses helper layers instead of calling APIs directly inside every page.
  - This keeps pages cleaner and easier to explain.
- Auth state is centralized in one provider instead of every page handling auth separately.
- TMDB response mapping happens in shared files, so the UI works with consistent movie/profile/search objects.
- There are local fallback paths in some TMDB features, which helps keep the app usable if live API data is missing.

### UX improvements
- Browse page remembers filters and scroll position when users come back from detail pages.
- Home page feels more personal by mixing general TMDB feeds with user-library-based recommendations.
- Explore avoids showing the same movies too often by tracking recent country results locally.
- Review page combines official movie data with live user feedback in one screen.
- Watchlist page is more than a saved list:
  - it supports watched history
  - favorites
  - sorting
  - filtering

### Integration between TMDB and Firebase
- A user can discover titles from TMDB, then save them into Firebase-backed personal lists.
- Movie detail pages combine:
  - TMDB metadata
  - Firebase review data
  - Firebase list state
- Profile pages combine:
  - Firestore profile/social data
  - library summaries
  - review references
  - TMDB movie hydration for saved titles
- Search, Browse, Home, Lists, and Explore all feed users into the same Firebase-backed personal actions.
