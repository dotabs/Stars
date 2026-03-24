# Presentation Script

## Project Overview
STARS is a movie discovery and social app built for users who want to explore films, save titles, review what they watch, and interact with other movie fans in one place.

The app combines rich movie data from TMDB with user-specific account and social features powered by Firebase.

## Tech Stack
- React + Vite for the frontend app and routing
- Tailwind CSS for styling and responsive UI
- TMDB API for movies, TV shows, people, posters, and discovery data
- Firebase Authentication for sign up, login, and session handling
- Firebase Firestore for profiles, watchlists, reviews, follows, notifications, and messages
- Firebase Storage for profile images and other stored user assets

## Key Features
- Home page with featured movies, trending rows, and recommendations
- Browse page with search, sorting, and advanced movie filters
- Explore page for country-based movie discovery
- Lists page with curated TMDB collections like trending, top rated, and upcoming
- Review page with detailed movie information and user feedback tools
- Personal library with watchlist, watched, and favorites
- User profiles with privacy settings, follow system, and social activity
- Notifications and direct messages between users
- Search across movies, TV shows, and people

## How The App Works
1. The user opens the app and lands on a TMDB-powered discovery experience.
2. Public movie, TV, and person data is fetched from TMDB through shared API helper files.
3. If the user signs in, Firebase Authentication manages their session.
4. User-specific actions like saving a movie, updating a profile, following someone, sending a message, or writing feedback are stored in Firebase.
5. Pages combine TMDB content with Firebase user data so the app feels both content-rich and personal.

## Problems Solved
- Makes movie discovery easier by bringing trending, curated, filtered, and international discovery into one app
- Keeps account features separate from content features while still connecting them clearly in the UI
- Gives users a personal movie space instead of just a static browsing experience
- Supports both solo use cases, like saving titles, and social use cases, like profiles, follows, notifications, and messages

## Improvements Made
- Removed dead code and an unused barrel file
- Removed an unused import and cleaned a stale hook dependency
- Replaced an empty catch block with a clear comment explaining the intended fallback behavior
- Added clear top-level comments to important files so it is easier to explain what each feature does
- Added comments showing where TMDB is used and where Firebase is responsible for user data
- Kept the presentation language simple so the project is easier to demo and explain

## Simple Demo Walkthrough
Start on the Home page and explain that TMDB powers the movie content.

Open Browse or Explore to show different discovery modes.

Open a movie detail page to show richer title information and user actions.

Show Watchlist or Profile to explain how Firebase stores personal user data.

Finish with Notifications or Messages to show the social side of the app.
