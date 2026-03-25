// Person page: TMDB-backed detail view for actors, directors, and other film people.
// Why it exists: search results should open into a richer filmography view instead of a shallow card.
// Connection: reads TMDB person details and preserves local session state for smoother back navigation.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Clapperboard, MapPin, Sparkles, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchPersonById, getSearchResultHref, getSearchResultTypeLabel } from '@/lib/tmdb-search';

const TIMELINE_PAGE_SIZE = 24;
const personSessionStorageKey = 'person:session-state';
const personStateCache = new Map();
const timelineTabs = [
  { id: 'all', label: 'All' },
  { id: 'acting', label: 'Acting' },
  { id: 'crew', label: 'Crew' },
];

function hasText(value) {
  return Boolean(typeof value === 'string' && value.trim());
}

function getCreditCategory(credit) {
  return hasText(credit.role) ? 'acting' : 'crew';
}

function buildTimelineCredits(person) {
  const merged = [...(person.castCredits ?? []), ...(person.crewCredits ?? [])]
    .map((credit) => ({
      ...credit,
      category: getCreditCategory(credit),
      roleLabel: credit.role || credit.job || person.knownForDepartment,
    }))
    .sort((left, right) => {
      const rightDate = right.date || '';
      const leftDate = left.date || '';
      if (rightDate !== leftDate) {
        return rightDate.localeCompare(leftDate);
      }
      return left.title.localeCompare(right.title);
    });

  return Array.from(new Map(merged.map((credit) => [`${credit.mediaType}-${credit.id}-${credit.roleLabel}`, credit])).values());
}

function groupTimelineCredits(credits) {
  return credits.reduce((groups, credit) => {
    const year = credit.subtitle || 'Date TBD';
    if (!groups.has(year)) {
      groups.set(year, []);
    }
    groups.get(year).push(credit);
    return groups;
  }, new Map());
}

function readPersonSessionState() {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const rawValue = window.sessionStorage.getItem(personSessionStorageKey);
    return rawValue ? JSON.parse(rawValue) : {};
  } catch {
    return {};
  }
}

function writePersonSessionState(state) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(personSessionStorageKey, JSON.stringify(state));
  } catch {
    // Ignore session storage write failures.
  }
}

function persistPersonSessionEntry(personId, entry) {
  if (!Number.isFinite(personId)) {
    return;
  }

  writePersonSessionState({
    ...readPersonSessionState(),
    [personId]: entry,
  });
}

function clearPersonSessionEntry(personId) {
  if (!Number.isFinite(personId) || typeof window === 'undefined') {
    return;
  }

  const nextState = { ...readPersonSessionState() };
  delete nextState[personId];
  writePersonSessionState(nextState);
}

function KnownForCard({ credit, onOpen }) {
  const href = getSearchResultHref({ id: credit.id, mediaType: credit.mediaType });

  return (
    <Link
      to={href}
      onClick={() => onOpen?.()}
      className="group flex items-center gap-3 rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-3 transition-all hover:-translate-y-0.5 hover:border-[#d26d47]/35 hover:bg-white/[0.05]"
    >
      <div className="flex h-16 w-12 flex-none items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
        {credit.imageUrl ? (
          <img src={credit.imageUrl} alt={credit.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" decoding="async" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,#3a241a,#1a1410)] text-sm font-semibold text-white/70">
            {credit.title.slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="line-clamp-1 text-sm font-semibold text-white group-hover:text-[#f4b684]">{credit.title}</p>
        <p className="mt-1 text-xs text-white/50">
          {getSearchResultTypeLabel(credit.mediaType)} • {credit.subtitle}
        </p>
        {credit.role || credit.job ? <p className="mt-1 line-clamp-1 text-xs text-white/68">{credit.role || credit.job}</p> : null}
      </div>
    </Link>
  );
}

function TimelineItem({ credit, onOpen }) {
  const href = getSearchResultHref({ id: credit.id, mediaType: credit.mediaType });

  return (
    <Link
      to={href}
      onClick={() => onOpen?.()}
      className="group grid gap-4 rounded-[1.4rem] border border-white/[0.08] bg-white/[0.03] p-4 transition-all hover:-translate-y-0.5 hover:border-[#d26d47]/35 hover:bg-white/[0.05] sm:grid-cols-[72px_minmax(0,1fr)]"
    >
      <div className="flex h-24 w-[4.5rem] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
        {credit.imageUrl ? (
          <img src={credit.imageUrl} alt={credit.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" decoding="async" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,#3a241a,#1a1410)] text-lg font-semibold text-white/70">
            {credit.title.slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="line-clamp-1 font-semibold text-white group-hover:text-[#f4b684]">{credit.title}</p>
          <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[11px] uppercase tracking-[0.16em] text-white/55">
            {credit.category === 'acting' ? 'Acting' : 'Crew'}
          </span>
        </div>
        <p className="mt-1 text-sm text-white/52">
          {credit.subtitle} • {getSearchResultTypeLabel(credit.mediaType)}
        </p>
        <p className="mt-2 text-sm text-white/75">{credit.roleLabel}</p>
      </div>
    </Link>
  );
}

export function Person() {
  const { id } = useParams();
  const navigate = useNavigate();
  const personId = Number(id);
  const hasValidPersonId = Number.isFinite(personId);
  const restoredSessionRef = useRef(readPersonSessionState());
  const restoredPersonEntry = hasValidPersonId && restoredSessionRef.current?.[personId]?.restoreOnReturn
    ? restoredSessionRef.current[personId]
    : null;
  const restoredCachedPerson = restoredPersonEntry && hasValidPersonId ? personStateCache.get(personId) ?? null : null;
  const hasAppliedInitialRestoreRef = useRef(false);
  const [state, setState] = useState({
    personId: restoredCachedPerson ? personId : null,
    person: restoredCachedPerson,
    loadError: '',
  });
  const [timelineState, setTimelineState] = useState({
    personId: restoredPersonEntry?.timelineState ? personId : null,
    activeTab: restoredPersonEntry?.timelineState?.activeTab ?? 'all',
    visibleCount: restoredPersonEntry?.timelineState?.visibleCount ?? TIMELINE_PAGE_SIZE,
  });
  const person = state.personId === personId ? state.person : null;
  const loadError = state.personId === personId ? state.loadError : '';
  const isLoading = hasValidPersonId && state.personId !== personId;
  const activeTab = timelineState.personId === personId ? timelineState.activeTab : 'all';
  const visibleCount = timelineState.personId === personId ? timelineState.visibleCount : TIMELINE_PAGE_SIZE;

  const persistCurrentSession = useCallback((scrollY = typeof window === 'undefined' ? 0 : window.scrollY, restoreOnReturn = false) => {
    if (!hasValidPersonId) {
      return;
    }

    persistPersonSessionEntry(personId, {
      timelineState: {
        activeTab: timelineState.personId === personId ? timelineState.activeTab : 'all',
        visibleCount: timelineState.personId === personId ? timelineState.visibleCount : TIMELINE_PAGE_SIZE,
      },
      scrollY,
      restoreOnReturn,
    });
  }, [hasValidPersonId, personId, timelineState.activeTab, timelineState.personId, timelineState.visibleCount]);

  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/browse');
  }

  useEffect(() => {
    let cancelled = false;

    if (!hasValidPersonId) {
      return () => {};
    }

    void fetchPersonById(personId)
      .then((response) => {
        if (!cancelled) {
          personStateCache.set(personId, response);
          setState({
            personId,
            person: response,
            loadError: '',
          });
        }
      })
      .catch((error) => {
        console.error('Failed to load person', error);
        if (!cancelled) {
          setState({
            personId,
            person: null,
            loadError: 'Failed to load person data.',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hasValidPersonId, personId]);

  useEffect(() => {
    if (!hasValidPersonId) {
      return;
    }

    if (!restoredPersonEntry) {
      clearPersonSessionEntry(personId);
    }
  }, [hasValidPersonId, personId, restoredPersonEntry]);

  useEffect(() => {
    if (!hasValidPersonId || !restoredPersonEntry || typeof window === 'undefined') {
      return;
    }

    if (hasAppliedInitialRestoreRef.current) {
      return;
    }

    const targetScrollY = Number(restoredPersonEntry.scrollY ?? 0);
    if (!Number.isFinite(targetScrollY) || targetScrollY <= 0) {
      hasAppliedInitialRestoreRef.current = true;
      clearPersonSessionEntry(personId);
      return;
    }

    let frameId = 0;
    let attempts = 0;
    const maxAttempts = 12;

    const restoreScroll = () => {
      const maxScrollY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const nextScrollY = Math.min(targetScrollY, maxScrollY);

      window.scrollTo({ top: nextScrollY, behavior: 'auto' });

      const isRestored = Math.abs(window.scrollY - nextScrollY) <= 2;
      const canReachTarget = maxScrollY >= targetScrollY - 2;

      if (isRestored && canReachTarget) {
        hasAppliedInitialRestoreRef.current = true;
        clearPersonSessionEntry(personId);
        return;
      }

      attempts += 1;
      if (attempts < maxAttempts) {
        frameId = window.requestAnimationFrame(restoreScroll);
        return;
      }

      hasAppliedInitialRestoreRef.current = true;
      clearPersonSessionEntry(personId);
    };

    frameId = window.requestAnimationFrame(restoreScroll);
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [hasValidPersonId, person, personId, restoredPersonEntry, timelineState.activeTab, timelineState.visibleCount]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        if (window.history.length > 1) {
          navigate(-1);
          return;
        }

        navigate('/browse');
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate]);

  const timelineCredits = useMemo(() => {
    if (!person) {
      return [];
    }
    const allCredits = buildTimelineCredits(person);
    if (activeTab === 'acting') {
      return allCredits.filter((credit) => credit.category === 'acting');
    }
    if (activeTab === 'crew') {
      return allCredits.filter((credit) => credit.category === 'crew');
    }
    return allCredits;
  }, [activeTab, person]);

  const visibleTimelineCredits = timelineCredits.slice(0, visibleCount);
  const groupedTimeline = useMemo(() => Array.from(groupTimelineCredits(visibleTimelineCredits).entries()), [visibleTimelineCredits]);
  const hasMoreTimeline = visibleCount < timelineCredits.length;

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
    <div className="min-h-screen bg-background pt-16 text-white">
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
          <div className="mb-6 flex justify-start">
            <Button
              type="button"
              className="btn-outline sticky top-20 cursor-pointer rounded-full px-5 shadow-[0_14px_34px_rgba(0,0,0,0.2)] hover:shadow-[0_18px_42px_rgba(210,109,71,0.22)]"
              onClick={handleBack}
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
          <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
            <div className="w-full max-w-xs">
              <div className="overflow-hidden rounded-[1.8rem] border border-white/10 bg-white/[0.03] shadow-[0_24px_70px_-28px_rgba(0,0,0,0.95)]">
                {person.imageUrl ? (
                  <img src={person.imageUrl} alt={person.name} className="aspect-[4/5] w-full object-cover" loading="eager" decoding="async" />
                ) : (
                  <div className="flex aspect-[4/5] items-center justify-center bg-[radial-gradient(circle_at_top,#3a241a,#1a1410)]">
                    <UserRound className="h-14 w-14 text-white/65" />
                  </div>
                )}
              </div>
            </div>

            <div className="max-w-4xl">
              <p className="section-kicker">Person</p>
              <h1 className="heading-display mt-3 text-4xl text-white md:text-5xl">{person.name}</h1>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[#d5f6e9]">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5">
                  <Sparkles className="h-4 w-4" />
                  {person.knownForDepartment}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                  <Clapperboard className="h-4 w-4" />
                  {person.primaryRole}
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
                  <p className="text-xs text-muted-foreground">Top work from TMDB</p>
                </div>
                {person.knownFor.length > 0 ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {person.knownFor.slice(0, 6).map((credit) => (
                      <KnownForCard key={`${credit.mediaType}-${credit.id}`} credit={credit} onOpen={() => persistCurrentSession(typeof window === 'undefined' ? 0 : window.scrollY, true)} />
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">Known-for credits are not available for this profile.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <section className="rounded-[1.6rem] border border-white/[0.08] bg-white/[0.03] p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">Filmography timeline</h2>
              <p className="mt-2 text-sm text-white/58">Latest to oldest, with acting and crew credits in one stream.</p>
            </div>
            <div className="flex flex-wrap gap-2">
                  {timelineTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setTimelineState({
                      personId,
                      activeTab: tab.id,
                      visibleCount: TIMELINE_PAGE_SIZE,
                    });
                  }}
                  className={`rounded-full border px-4 py-2 text-sm transition-all ${
                    activeTab === tab.id
                      ? 'border-[#d26d47]/45 bg-[#d26d47]/18 text-white'
                      : 'border-white/10 bg-black/20 text-white/70 hover:border-white/20 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {groupedTimeline.length === 0 ? (
            <p className="mt-6 text-sm text-white/55">No credits are available for this filter.</p>
          ) : (
            <div className="mt-8 space-y-8">
              {groupedTimeline.map(([year, credits]) => (
                <section key={year} className="grid gap-4 lg:grid-cols-[96px_minmax(0,1fr)]">
                  <div className="pt-1">
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#f2b38c]">{year}</p>
                  </div>
                  <div className="space-y-3 border-l border-white/10 pl-5">
                    {credits.map((credit) => (
                      <TimelineItem key={`${credit.mediaType}-${credit.id}-${credit.roleLabel}`} credit={credit} onOpen={() => persistCurrentSession(typeof window === 'undefined' ? 0 : window.scrollY, true)} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          {hasMoreTimeline ? (
            <div className="mt-8 flex justify-center">
              <Button
                className="btn-outline rounded-full px-6"
                onClick={() =>
                  setTimelineState((current) => ({
                    personId,
                    activeTab,
                    visibleCount: (current.personId === personId ? current.visibleCount : TIMELINE_PAGE_SIZE) + TIMELINE_PAGE_SIZE,
                  }))
                }
              >
                Load more
              </Button>
            </div>
          ) : null}
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button onClick={() => navigate(-1)} className="btn-primary">
            Back
          </Button>
          <Button asChild className="btn-outline text-white">
            <Link to="/browse">Browse Movies</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
