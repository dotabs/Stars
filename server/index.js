import express from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

function normalizeTmdbCredentials(apiKey, readAccessToken) {
    const normalizedApiKey = apiKey?.trim() || '';
    const normalizedReadAccessToken = readAccessToken?.trim() || '';
    // Accept either TMDB format even if pasted into the wrong env var.
    if (normalizedApiKey.startsWith('eyJ') && !normalizedReadAccessToken) {
        return {
            tmdbApiKey: '',
            tmdbReadAccessToken: normalizedApiKey,
        };
    }
    return {
        tmdbApiKey: normalizedApiKey,
        tmdbReadAccessToken: normalizedReadAccessToken,
    };
}

const tmdbCredentials = normalizeTmdbCredentials(process.env.TMDB_API_KEY, process.env.TMDB_READ_ACCESS_TOKEN);
const TMDB_API_KEY = tmdbCredentials.tmdbApiKey;
const TMDB_READ_ACCESS_TOKEN = tmdbCredentials.tmdbReadAccessToken;

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('dist'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// TMDB Proxy
app.use('/api/tmdb', async (req, res) => {
  try {
    const tmdbPath = req.originalUrl.replace('/api/tmdb', '');
    const url = `https://api.themoviedb.org/3${tmdbPath}`;

    const apiKey = TMDB_API_KEY;
    const readAccessToken = TMDB_READ_ACCESS_TOKEN;

    if (!apiKey && !readAccessToken) {
      return res.status(500).json({ error: 'TMDB credentials not configured' });
    }

    const headers = new Headers();
    if (readAccessToken) {
      headers.set('Authorization', `Bearer ${readAccessToken}`);
    }

    const response = await fetch(url, {
      method: req.method,
      headers,
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `TMDB API error: ${response.statusText}` });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('TMDB proxy error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});