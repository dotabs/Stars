# STARS Codebase Map

This file is a practical guide to how the app is connected so you can read the codebase in the right order.

## 1. What this app is

STARS is a React single-page app built with Vite.

It combines two data sources:

- TMDB for movie, TV, person, browse, discovery, and search data
- Firebase for authentication, profiles, social features, notifications, direct messages, reviews, and each user's saved library state

At a high level:

1. `src/main.jsx` mounts the app.
2. `AuthProvider` establishes the signed-in user state.
3. `ToastProvider` exposes app-wide toast notifications.
4. `src/App.jsx` creates the router and lazy-loads the pages.
5. Pages call hooks and `src/lib/*` helpers.
6. `src/lib/tmdb*.js` talks to TMDB.
7. `src/lib/firebase.js`, `src/lib/social.js`, `src/lib/user-library.js`, and `src/lib/movie-feedback.js` talk to Firebase.

## 2. Read order

If you want to understand the app quickly, read files in this order:

1. `package.json`
2. `src/main.jsx`
3. `src/App.jsx`
4. `src/components/auth/AuthContext.jsx`
5. `src/lib/env.js`
6. `src/lib/firebase.js`
7. `src/lib/tmdb.js`
8. `src/lib/tmdb-movies.js`
9. `src/lib/user-library.js`
10. `src/lib/movie-feedback.js`
11. `src/lib/social.js`
12. the page files in `src/pages`

That path gives you the app shell first, then backend/data integrations, then page behavior.

## 3. Runtime flow

### App startup

- `src/main.jsx` imports global CSS, then renders:
  - `AuthProvider`
  - `ToastProvider`
  - `App`

This means auth state and toast state are available everywhere below the root.

### Routing

- `src/App.jsx` chooses `BrowserRouter` or `HashRouter` from `appEnv.routerMode`
- all page modules are lazy-loaded with `React.lazy`
- `Layout` wraps every route
- `Navbar` and `Footer` render on every page except `/login` and `/signup`
- `AuthGate` only protects the auth pages from signed-in users; it does not protect the rest of the app

Important implication:

- Most app pages are public
- authenticated features fail gracefully when the user is not signed in
- pages commonly show a toast like "Sign in required" instead of redirecting

## 4. Main architectural layers

### Layer A: App shell and routing

Files:

- `src/main.jsx`
- `src/App.jsx`
- `src/index.css`

Responsibility:

- bootstrapping React
- global layout
- route selection
- suspense fallback and error boundary behavior

### Layer B: Global providers and hooks

Files:

- `src/components/auth/AuthContext.jsx`
- `src/components/auth/useAuth.js`
- `src/components/ui-custom/ToastProvider.jsx`
- `src/hooks/*`

Responsibility:

- current user state
- toast state
- derived subscriptions over Firebase-backed data

Key pattern:

- providers expose base context
- hooks adapt those contexts or subscribe to document collections

### Layer C: Domain services

Files:

- `src/lib/env.js`
- `src/lib/firebase.js`
- `src/lib/tmdb.js`
- `src/lib/tmdb-movies.js`
- `src/lib/tmdb-search.js`
- `src/lib/social.js`
- `src/lib/user-library.js`
- `src/lib/movie-feedback.js`
- `src/lib/notifications.js`
- `src/lib/profile-data.js`

Responsibility:

- external API access
- data normalization
- Firebase document updates
- caching
- transforming raw responses into UI-friendly shapes

This is the real backend/client boundary for the frontend. Most pages should stay thinner than these files.

### Layer D: Pages

Files:

- `src/pages/*`

Responsibility:

- orchestrate data loading
- manage page-local UI state
- call services/hooks
- render page-level sections

### Layer E: Components

Files:

- `src/components/ui/*`
- `src/components/ui-custom/*`

Responsibility:

- reusable visual building blocks
- app-specific display components like posters, cards, navbar, search UI, score displays, and modal wrappers

## 5. State model

The app has four main state buckets.

### 1. Auth state

Owned by:

- `src/components/auth/AuthContext.jsx`

Source:

- Firebase Auth via `subscribeToAuthState`

Behavior:

- on auth change, the provider updates `currentUser`
- when a user signs in, it lazily imports `ensureUserProfile` from `src/lib/social.js`
- that guarantees a Firestore profile exists for the signed-in user

### 2. User library state

Owned by:

- `src/lib/user-library.js`
- consumed through `src/hooks/use-user-library.js`

Source:

- Firestore document in `userLibraries/{userId}`

Behavior:

- stores watchlist, watched, and favorites as flags under `items`
- hook subscribes to the library document in real time
- profile stats are synchronized after writes

### 3. Movie feedback state

Owned by:

- `src/lib/movie-feedback.js`
- consumed through `src/hooks/use-movie-feedback.js`

Source:

- Firestore subcollection `movieFeedback/{movieId}/entries/{userId}`

Behavior:

- real-time subscription per movie
- derives average rating, review count, spoiler list, and histogram breakdown
- updates each user profile's review stats through `syncUserReviewStat`

### 4. Page-local UI state

Owned inside pages/components

Examples:

- search query text
- active carousel index on Home
- modal visibility
- spoiler toggle state
- form inputs

## 6. Environment and configuration

Primary file:

- `src/lib/env.js`

It normalizes:

- app name
- router mode
- base path
- TMDB credentials
- Firebase credentials

Important flags:

- `hasTmdbCredentials`
- `hasFirebaseConfig`
- `hasFirebaseStorageConfig`

These flags control whether TMDB-backed and Firebase Storage-backed features are viable.

## 7. TMDB data flow

### Core entry point

- `src/lib/tmdb.js`

This file:

- builds TMDB URLs
- attaches `api_key` or bearer token auth
- caches GET requests in memory
- returns parsed JSON

Think of this as the base HTTP client for TMDB.

### Higher-level movie service

- `src/lib/tmdb-movies.js`

This is one of the most important files in the repo.

It handles:

- home feed assembly
- browse catalog fetching
- detailed movie fetches
- similar movies and recommendations
- watch provider mapping
- genre mapping
- local fallback behavior when TMDB fails

There are two important concepts in this file:

1. Route IDs for TMDB movies use a prefixed form like `tmdb-12345`
2. Raw TMDB responses are normalized into app movie objects used by the UI

### Search

- `src/lib/tmdb-search.js`
- `src/hooks/use-global-search.js`

Search is handled through TMDB-backed helper functions and then exposed to pages/components through a hook.

### Local fallback data

- `src/data/movies.js`

If TMDB details are missing or TMDB requests fail, some flows fall back to local data.

That means the codebase supports both:

- live TMDB content
- a smaller embedded local catalog

## 8. Firebase data flow

### Firebase bootstrap

- `src/lib/firebase.js`

This file initializes:

- Firebase app
- Auth
- Firestore
- Storage

It also exposes auth helpers:

- sign up
- login
- logout
- auth profile updates
- password updates
- auth error normalization

### Auth lifecycle

Flow:

1. Firebase emits auth state
2. `AuthProvider` converts the raw auth user into a light snapshot
3. if signed in, `ensureUserProfile(user)` runs
4. the rest of the app reads `currentUser` from context

### Social/profile system

- `src/lib/social.js`

This is the heaviest Firebase service in the repo.

It owns:

- user profile creation and updates
- public profile handle mapping
- avatar upload/delete
- follower/following relationships
- follow requests
- notifications
- direct conversations and messages
- privacy rules for who can see or message whom
- syncing profile identity into related documents

This file is acting as a small client-side domain service layer over multiple Firestore collections.

### User library

- `src/lib/user-library.js`

This module stores movie state by user:

- watchlist
- watched
- favorites

It also updates profile stats after each mutation.

### Movie feedback

- `src/lib/movie-feedback.js`

This module stores and streams:

- rating
- review text
- spoiler text

per movie per user.

## 9. Firestore mental model

Based on the service files, the main document layout is roughly:

```text
userProfiles/{userId}
userProfiles/{userId}/followers/{otherUserId}
userProfiles/{userId}/following/{otherUserId}
userProfiles/{userId}/followRequests/{otherUserId}
userProfiles/{userId}/notifications/{notificationId}
userProfiles/{userId}/conversations/{conversationId}
userProfiles/{userId}/reviews/{reviewId}

userProfileHandles/{publicProfileId}

userLibraries/{userId}

movieFeedback/{movieId}/entries/{userId}

conversations/{conversationId}
conversations/{conversationId}/messages/{messageId}
```

Important design choice:

- profile data is denormalized into followers, messages, notifications, and feedback entries

That is why `syncProfileIdentityReferences` exists. When a user changes username/avatar/profile id, related records need to be updated too.

## 10. Page map

### `Home.jsx`

Purpose:

- live homepage built from TMDB feeds
- hero rotation
- recommendation row based on saved movies

Depends heavily on:

- `fetchHomeFeed`
- `fetchMoviesByRouteIds`
- `useUserLibrary`
- `toggleLibraryItem`

### `Browse.jsx`

Purpose:

- large TMDB-driven catalog browsing experience with filters and sorting

Depends heavily on:

- `src/lib/tmdb-movies.js`
- browse query serialization and filtering logic

### `SearchResults.jsx`

Purpose:

- global search results over TMDB-backed content

### `Review.jsx`

Purpose:

- detailed movie page
- fetches TMDB detail or local fallback
- lets the user:
  - mark watchlist/watched/favorite
  - save a rating/review
  - read reviews
  - open people pages
  - open provider links

This page is where TMDB data and Firebase user-generated data meet most directly.

### `Person.jsx`

Purpose:

- TMDB person details page

### `TvShow.jsx`

Purpose:

- TMDB TV details page

### `Watchlist.jsx` and `Lists.jsx`

Purpose:

- render user-saved movie collections based on the library document

### `Profile.jsx`

Purpose:

- user profile page
- profile editing
- privacy fields
- avatar updates
- follower/following data
- likely library/review summary views

### `ProfileConnections.jsx`

Purpose:

- dedicated followers/following views

### `Notifications.jsx`

Purpose:

- user notification inbox backed by Firestore

### `Messages.jsx`

Purpose:

- direct messaging UI over Firestore conversations and messages

### `Login.jsx` and `Signup.jsx`

Purpose:

- Firebase email/password auth entry points

### `Explore.jsx`

Purpose:

- discovery/editorial browsing on top of TMDB-derived collections

### `ControlRoom.jsx`

Purpose:

- likely internal/admin/debug/power-user page

## 11. Important reusable hooks

### `useAuth`

- thin access to auth context

### `useUserLibrary`

- combines auth state with a real-time Firestore library subscription

### `useMovieFeedback`

- subscribes to all feedback entries for a movie

### `useGlobalSearch`

- debounced-style query-driven global search over TMDB

### `useUnreadNotificationsCount`

- likely a focused notification counter hook for the navbar

## 12. Important reusable UI components

### `Navbar`

- cross-page navigation
- likely displays auth-sensitive actions and notifications/search

### `PosterImage`

- shared poster/backdrop rendering wrapper

### `MovieCard`

- normalized movie display block

### `SiteSearch` and `GlobalSearchResults`

- app-wide search entry and rendering pieces

### `ConfirmModal`

- destructive action confirmation

### `AppErrorBoundary`

- catches top-level render/runtime failures

## 13. Key cross-cutting patterns

### Pattern: lazy routes

- route modules are loaded only when needed
- initial bundle stays smaller

### Pattern: real-time Firebase subscriptions

- user library
- movie feedback
- likely notifications/messages in other modules

This means several views stay live without manual refresh.

### Pattern: denormalized Firestore records

- follower lists, notifications, inbox records, and review metadata copy identity fields
- this improves read simplicity but increases update complexity

### Pattern: cache-heavy TMDB client logic

- TMDB requests are cached in memory
- browse/detail functions keep their own maps too

### Pattern: graceful unauthenticated use

- most pages still work when logged out
- writes fail with domain-specific auth errors
- UI converts those to toasts

## 14. What is most important to understand first

If your goal is understanding "how everything works together", these are the highest-value files:

- `src/App.jsx`
- `src/components/auth/AuthContext.jsx`
- `src/lib/tmdb-movies.js`
- `src/lib/social.js`
- `src/lib/user-library.js`
- `src/lib/movie-feedback.js`
- `src/pages/Review.jsx`
- `src/pages/Home.jsx`

Reason:

- `App.jsx` tells you what can render
- auth context tells you how user identity enters the tree
- TMDB services explain content loading
- Firebase services explain persistent app state
- `Review.jsx` shows the richest integration point
- `Home.jsx` shows the discovery/feed side

## 15. Recommended way to study the repo

### Pass 1: app shell

Read:

- `src/main.jsx`
- `src/App.jsx`

Goal:

- understand startup, routing, layout, and auth page behavior

### Pass 2: providers and auth

Read:

- `src/components/auth/AuthContext.jsx`
- `src/lib/firebase.js`
- `src/lib/env.js`

Goal:

- understand how sign-in state and env config affect the app

### Pass 3: content services

Read:

- `src/lib/tmdb.js`
- `src/lib/tmdb-movies.js`
- `src/lib/tmdb-search.js`

Goal:

- understand how external movie data is fetched, cached, normalized, and routed into pages

### Pass 4: user data services

Read:

- `src/lib/user-library.js`
- `src/lib/movie-feedback.js`
- `src/lib/social.js`

Goal:

- understand how user-specific state is stored and synchronized

### Pass 5: page orchestration

Read:

- `src/pages/Home.jsx`
- `src/pages/Browse.jsx`
- `src/pages/Review.jsx`
- `src/pages/Profile.jsx`
- `src/pages/Messages.jsx`

Goal:

- see how the service layer is consumed by actual UI

## 16. Where complexity really lives

The hardest parts of the repo are not the components. They are:

1. `src/lib/tmdb-movies.js`
2. `src/lib/social.js`
3. `src/pages/Review.jsx`

Why:

- `tmdb-movies.js` contains the main normalization, browse, watch-provider, and feed-building logic
- `social.js` owns the broadest Firestore surface area and the most denormalized writes
- `Review.jsx` merges movie detail data, user library data, and user feedback data in one page

## 17. Short version

If you only remember one sentence, use this:

STARS is a React/Vite movie app where TMDB provides the content catalog and Firebase provides all user-owned state, with pages mostly acting as orchestration layers over a fairly large `src/lib` service layer.

