import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CalendarDays, MapPin, Sparkles, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSearchResultHref, getSearchResultTypeLabel, fetchPersonById } from '@/lib/tmdb-search';
import type { PersonDetails } from '@/types';

export function Person() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const personId = Number(id);
  const hasValidPersonId = Number.isFinite(personId);
  const [person, setPerson] = useState<PersonDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!hasValidPersonId) return;

    void Promise.resolve().then(() => {
      if (cancelled) return;

      setIsLoading(true);
      setLoadError('');

      return fetchPersonById(personId)
        .then((response) => {
          if (!cancelled) {
            setPerson(response);
          }
        })
        .catch((error) => {
          console.error('Failed to load person', error);
          if (!cancelled) {
            setLoadError('Failed to load person data.');
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIsLoading(false);
          }
        });
    });

    return () => {
      cancelled = true;
    };
  }, [hasValidPersonId, personId]);

  if (isLoading && !person) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background pt-16">
        <div className="section-panel w-full max-w-md px-6 py-10 text-center">
          <p className="section-kicker">Loading</p>
          <h1 className="heading-display mt-3 text-4xl text-white">Opening profile</h1>
        </div>
      </div>
    );
  }

  if (!hasValidPersonId || !person) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background pt-16">
        <div className="section-panel w-full max-w-lg px-6 py-10 text-center">
          <p className="section-kicker">Unavailable</p>
          <h1 className="heading-display mt-3 text-4xl text-white">Person not available</h1>
          <p className="mt-4 text-sm text-muted-foreground">
            {hasValidPersonId ? loadError || 'This profile could not be loaded right now.' : 'This person could not be found.'}
          </p>
          <Button onClick={() => navigate('/')} className="btn-primary mt-6">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-16">
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 h-[28rem]">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${person.backdropUrl || person.imageUrl})`,
              filter: 'blur(40px) brightness(0.22)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-10 pt-12 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-8 lg:flex-row">
            <div className="w-full max-w-xs flex-none">
              <div className="overflow-hidden rounded-[1.8rem] border border-white/10 bg-white/[0.03] shadow-[0_24px_70px_-28px_rgba(0,0,0,0.95)]">
                {person.imageUrl ? (
                  <img
                    src={person.imageUrl}
                    alt={person.name}
                    className="aspect-[4/5] w-full object-cover"
                    loading="eager"
                    decoding="async"
                  />
                ) : (
                  <div className="flex aspect-[4/5] items-center justify-center">
                    <UserRound className="h-14 w-14 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>

            <div className="max-w-4xl flex-1">
              <p className="section-kicker">Person</p>
              <h1 className="heading-display mt-3 text-4xl text-white md:text-5xl">{person.name}</h1>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[#d5f6e9]">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5">
                  <Sparkles className="h-4 w-4" />
                  {person.knownForDepartment}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                  <CalendarDays className="h-4 w-4" />
                  {person.birthday || 'Birth date unavailable'}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                  <MapPin className="h-4 w-4" />
                  {person.placeOfBirth}
                </span>
              </div>

              <div className="section-panel mt-8 rounded-[1.5rem] p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Biography</p>
                <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">{person.biography}</p>
              </div>

              <div className="section-panel mt-6 rounded-[1.5rem] p-6">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Known For</p>
                  <p className="text-xs text-muted-foreground">Top credited work from TMDB</p>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {person.knownFor.length > 0 ? (
                    person.knownFor.map((credit) => (
                      <Link
                        key={`${credit.mediaType}-${credit.id}`}
                        to={getSearchResultHref({ id: credit.id, mediaType: credit.mediaType })}
                        className="group flex items-center gap-3 rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-3 transition-all hover:border-white/15 hover:bg-white/[0.05]"
                      >
                        <div className="flex h-16 w-12 flex-none items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
                          {credit.imageUrl ? (
                            <img
                              src={credit.imageUrl}
                              alt={credit.title}
                              className="h-full w-full object-cover"
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <UserRound className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="line-clamp-1 text-sm font-semibold text-white group-hover:text-[#f4b684]">
                            {credit.title}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {getSearchResultTypeLabel(credit.mediaType)} • {credit.subtitle}
                          </p>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Known-for credits are not available for this profile.</p>
                  )}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button onClick={() => navigate(-1)} className="btn-primary">
                  Back
                </Button>
                <Button asChild className="btn-outline text-white">
                  <Link to="/browse">Browse Movies</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}
