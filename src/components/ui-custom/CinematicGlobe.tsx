import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';
import worldAtlas from 'world-atlas/countries-110m.json';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { exploreCatalogByGlobeName, type ExploreCountryStat } from '@/data/explore';
import type { CountryCatalogEntry } from '@/lib/country-catalog';

type Rotation = [number, number, number];

interface GlobeTooltipState {
  country: ExploreCountryStat;
  x: number;
  y: number;
}

interface CinematicGlobeProps {
  countries: ExploreCountryStat[];
  selectedCountryKey: string;
  pinnedCountryKeys: string[];
  spinToken: number;
  onCountrySelect: (country: ExploreCountryStat) => void;
  onSpinStateChange?: (spinning: boolean) => void;
  className?: string;
}

type CountryFeature = Feature<Geometry, { name?: string }>;

const OCEAN = '#0B1220';
const COUNTRY_FILL = '#162033';
const COUNTRY_BORDER = 'rgba(255,255,255,0.08)';
const GRID_LINE = 'rgba(255,255,255,0.05)';
const ACCENT_RED = '#FF3B3B';
const SOFT_GLOW = 'rgba(255,59,59,0.35)';
const EXPLORED_GOLD = '#F3C86A';

const emptyCountryCache = new Map<string, ExploreCountryStat>();

function getEmptyCountryStat(name: string): ExploreCountryStat {
  const existing = emptyCountryCache.get(name);
  if (existing) return existing;

  const created: ExploreCountryStat = {
    key: name,
    label: name,
    globeName: name,
    flag: 'GL',
    region: 'World',
    filmCount: 0,
    averageScore: 0,
    topGenres: [],
    genreCounts: [],
    topFilms: [],
    posterFilms: [],
    movies: [],
    explored: false,
  };

  emptyCountryCache.set(name, created);
  return created;
}

function toExploreCountryStat(country: CountryCatalogEntry | ExploreCountryStat): ExploreCountryStat {
  if ('filmCount' in country) return country;

  return {
    key: country.key,
    label: country.label,
    globeName: country.globeName,
    flag: country.flag,
    region: country.region,
    filmCount: 0,
    averageScore: 0,
    topGenres: [],
    genreCounts: [],
    topFilms: [],
    posterFilms: [],
    movies: [],
    explored: false,
    totalPoolResults: 0,
    source: 'local',
    standoutTitles: [],
  };
}

function clampLatitude(value: number) {
  return Math.max(-70, Math.min(70, value));
}

function wrapDegrees(value: number) {
  let wrapped = value;
  while (wrapped <= -180) wrapped += 360;
  while (wrapped > 180) wrapped -= 360;
  return wrapped;
}

function shortestRotation(start: number, target: number) {
  const delta = ((((target - start) % 360) + 540) % 360) - 180;
  return start + delta;
}

function getFlagLabel(code: string) {
  if (code.length !== 2) return code;
  return code;
}

export function CinematicGlobe({
  countries,
  selectedCountryKey,
  pinnedCountryKeys,
  spinToken,
  onCountrySelect,
  onSpinStateChange,
  className,
}: CinematicGlobeProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const autoRotateFrameRef = useRef<number | null>(null);
  const rotationRef = useRef<Rotation>([18, -18, 0]);
  const lastSpinTokenRef = useRef(spinToken);
  const lastSelectedKeyRef = useRef(selectedCountryKey);
  const dragTimeoutRef = useRef<number | null>(null);
  const [size, setSize] = useState(620);
  const [rotation, setRotation] = useState<Rotation>([18, -18, 0]);
  const [scale, setScale] = useState(1);
  const [hoveredCountryName, setHoveredCountryName] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<GlobeTooltipState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);

  const baseScale = Math.max(size * 0.325, 150);
  const globeScale = baseScale * scale;

  const countriesGeo = useMemo(
    () =>
      feature(
        worldAtlas as unknown as Parameters<typeof feature>[0],
        (worldAtlas as unknown as { objects: { countries: Parameters<typeof feature>[1] } }).objects
          .countries,
      ) as unknown as FeatureCollection<
        Geometry,
        { name?: string }
      >,
    [],
  );

  const countryFeatures = countriesGeo.features as CountryFeature[];

  const featureByName = useMemo(
    () =>
      new Map(
        countryFeatures
          .map((country) => [country.properties?.name ?? '', country] as const)
          .filter(([name]) => Boolean(name)),
      ),
    [countryFeatures],
  );

  const selectedCountry = useMemo(
    () => countries.find((country) => country.key === selectedCountryKey) ?? countries[0],
    [countries, selectedCountryKey],
  );
  const countryByGlobeName = useMemo(
    () => new Map(countries.map((country) => [country.globeName, country] as const)),
    [countries],
  );

  const projection = useMemo(
    () =>
      d3
        .geoOrthographic()
        .translate([size / 2, size / 2])
        .scale(globeScale)
        .rotate(rotation)
        .clipAngle(90)
        .precision(0.1),
    [globeScale, rotation, size],
  );

  const path = useMemo(() => d3.geoPath(projection), [projection]);
  const sphere = useMemo(() => ({ type: 'Sphere' } as const), []);
  const graticule = useMemo(() => d3.geoGraticule10(), []);
  const centerCoordinates = useMemo(
    () => [-rotation[0], -rotation[1]] as [number, number],
    [rotation],
  );

  const markerRadiusScale = useMemo(
    () =>
      d3
        .scaleSqrt()
        .domain([0, d3.max(countries, (country) => country.filmCount) ?? 1])
        .range([3, 13]),
    [countries],
  );

  const setRotationState = useCallback((nextRotation: Rotation) => {
    const normalized: Rotation = [
      wrapDegrees(nextRotation[0]),
      clampLatitude(nextRotation[1]),
      0,
    ];
    rotationRef.current = normalized;
    setRotation(normalized);
  }, []);

  const stopActiveAnimation = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const animateToRotation = useCallback(
    (
      targetRotation: Rotation,
      options?: {
        duration?: number;
        extraTurns?: number;
        onComplete?: () => void;
      },
    ) => {
      stopActiveAnimation();

      const startRotation = rotationRef.current;
      const duration = options?.duration ?? 1000;
      const baseTargetLambda = shortestRotation(startRotation[0], targetRotation[0]);
      const targetLambda = baseTargetLambda + (options?.extraTurns ?? 0) * 360;
      const targetPhi = clampLatitude(targetRotation[1]);
      const ease = d3.easeCubicOut;
      const startedAt = performance.now();

      const tick = (timestamp: number) => {
        const progress = Math.min((timestamp - startedAt) / duration, 1);
        const eased = ease(progress);

        setRotationState([
          startRotation[0] + (targetLambda - startRotation[0]) * eased,
          startRotation[1] + (targetPhi - startRotation[1]) * eased,
          0,
        ]);

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(tick);
          return;
        }

        animationFrameRef.current = null;
        setRotationState([targetLambda, targetPhi, 0]);
        options?.onComplete?.();
      };

      animationFrameRef.current = requestAnimationFrame(tick);
    },
    [setRotationState, stopActiveAnimation],
  );

  useEffect(() => {
    const node = wrapperRef.current;
    if (!node) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      const nextWidth = entry?.contentRect.width ?? 620;
      setSize(Math.max(Math.min(nextWidth, 860), 320));
    });

    resizeObserver.observe(node);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const svgNode = svgRef.current;
    if (!svgNode) return;

    const dragBehavior = d3
      .drag<SVGSVGElement, unknown>()
      .on('start', () => {
        if (dragTimeoutRef.current !== null) {
          window.clearTimeout(dragTimeoutRef.current);
          dragTimeoutRef.current = null;
        }
        setIsDragging(true);
      })
      .on('drag', (event) => {
        const current = rotationRef.current;
        setRotationState([
          current[0] + event.dx * 0.35,
          current[1] - event.dy * 0.35,
          0,
        ]);
      })
      .on('end', () => {
        dragTimeoutRef.current = window.setTimeout(() => {
          setIsDragging(false);
        }, 120);
      });

    d3.select(svgNode).call(dragBehavior).on('dblclick.zoom', null);

    return () => {
      d3.select(svgNode).on('.drag', null);
      if (dragTimeoutRef.current !== null) {
        window.clearTimeout(dragTimeoutRef.current);
      }
    };
  }, [setRotationState]);

  useEffect(() => {
    if (autoRotateFrameRef.current !== null) {
      cancelAnimationFrame(autoRotateFrameRef.current);
      autoRotateFrameRef.current = null;
    }

    if (isDragging || isSpinning) return;

    let previous = performance.now();
    const autoRotate = (timestamp: number) => {
      const elapsed = timestamp - previous;
      previous = timestamp;
      const [lambda, phi] = rotationRef.current;
      setRotationState([lambda + elapsed * 0.0045, phi, 0]);
      autoRotateFrameRef.current = requestAnimationFrame(autoRotate);
    };

    autoRotateFrameRef.current = requestAnimationFrame(autoRotate);
    return () => {
      if (autoRotateFrameRef.current !== null) {
        cancelAnimationFrame(autoRotateFrameRef.current);
        autoRotateFrameRef.current = null;
      }
    };
  }, [isDragging, isSpinning, setRotationState]);

  useEffect(() => {
    const selectedFeature = featureByName.get(selectedCountry?.globeName ?? '');
    if (!selectedFeature) return;

    const [longitude, latitude] = d3.geoCentroid(selectedFeature);
    const targetRotation: Rotation = [-longitude, -latitude, 0];

    if (spinToken !== lastSpinTokenRef.current) {
      lastSpinTokenRef.current = spinToken;
      lastSelectedKeyRef.current = selectedCountryKey;
      requestAnimationFrame(() => {
        setIsSpinning(true);
        onSpinStateChange?.(true);
      });
      animateToRotation(targetRotation, {
        duration: 2200,
        extraTurns: 2,
        onComplete: () => {
          setIsSpinning(false);
          onSpinStateChange?.(false);
        },
      });
      return;
    }

    if (selectedCountryKey !== lastSelectedKeyRef.current) {
      lastSelectedKeyRef.current = selectedCountryKey;
      animateToRotation(targetRotation, { duration: 1100 });
    }
  }, [
    animateToRotation,
    featureByName,
    onSpinStateChange,
    selectedCountry,
    selectedCountryKey,
    spinToken,
  ]);

  useEffect(() => {
    return () => {
      stopActiveAnimation();
      if (autoRotateFrameRef.current !== null) {
        cancelAnimationFrame(autoRotateFrameRef.current);
      }
    };
  }, [stopActiveAnimation]);

  const setTooltipForCountry = useCallback(
    (countryName: string, clientX: number, clientY: number) => {
      const bounds = wrapperRef.current?.getBoundingClientRect();
      const countryCandidate =
        countryByGlobeName.get(countryName) ??
        exploreCatalogByGlobeName.get(countryName) ??
        getEmptyCountryStat(countryName);
      const country = toExploreCountryStat(countryCandidate);
      if (!bounds) {
        setTooltip({ country, x: 0, y: 0 });
        return;
      }

      setTooltip({
        country,
        x: clientX - bounds.left,
        y: clientY - bounds.top,
      });
    },
    [countryByGlobeName],
  );

  const markerData = useMemo(() => {
    return countries
      .map((country) => {
        const currentFeature = featureByName.get(country.globeName);
        if (!currentFeature) return null;

        const coordinates = d3.geoCentroid(currentFeature);
        const projected = projection(coordinates);
        if (!projected) return null;

        const visible = d3.geoDistance(centerCoordinates, coordinates) < Math.PI / 2;
        if (!visible) return null;

        return {
          country,
          coordinates,
          projected,
          radius: markerRadiusScale(Math.max(country.filmCount, 8)),
        };
      })
      .filter(Boolean) as Array<{
      country: ExploreCountryStat;
      coordinates: [number, number];
      projected: [number, number];
      radius: number;
    }>;
  }, [centerCoordinates, countries, featureByName, markerRadiusScale, projection]);

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const nextScale = Math.max(0.8, Math.min(2.25, scale - event.deltaY * 0.001));
    setScale(nextScale);
  };

  return (
    <div ref={wrapperRef} className={className} onWheel={handleWheel}>
      <div className="absolute inset-0 rounded-full opacity-80"
        style={{
          background:
            'radial-gradient(circle at 35% 30%, rgba(255,59,59,0.12) 0%, rgba(11,18,32,0) 42%), radial-gradient(circle at 68% 74%, rgba(92,128,255,0.14) 0%, rgba(11,18,32,0) 38%)',
          filter: 'blur(18px)',
        }}
      />

      <div className="absolute inset-[7%] rounded-full border border-white/10" />
      <div className="absolute inset-[11%] rounded-full border border-white/5" />
      <div className="absolute inset-[14%] rounded-full opacity-40"
        style={{
          boxShadow: `0 0 120px ${SOFT_GLOW}, inset 0 0 60px rgba(255,255,255,0.03)`,
        }}
      />

      <svg
        ref={svgRef}
        viewBox={`0 0 ${size} ${size}`}
        className="relative z-10 h-full w-full cursor-grab active:cursor-grabbing select-none"
        role="img"
        aria-label="Interactive cinematic globe"
      >
        <defs>
          <filter id="stars-globe-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="stars-marker-glow" x="-200%" y="-200%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="stars-ocean" cx="35%" cy="30%">
            <stop offset="0%" stopColor="#17243C" />
            <stop offset="60%" stopColor={OCEAN} />
            <stop offset="100%" stopColor="#060A13" />
          </radialGradient>
        </defs>

        <path d={path(sphere) ?? undefined} fill="url(#stars-ocean)" />
        <path
          d={path(graticule) ?? undefined}
          fill="none"
          stroke={GRID_LINE}
          strokeWidth={0.8}
        />

        {countryFeatures.map((country) => {
          const countryName = country.properties?.name ?? '';
          const statCandidate =
            countryByGlobeName.get(countryName) ?? exploreCatalogByGlobeName.get(countryName);
          const stat = statCandidate ? toExploreCountryStat(statCandidate) : null;
          const isSelected = stat?.key === selectedCountryKey;
          const isHovered = hoveredCountryName === countryName;
          const isPinned = stat ? pinnedCountryKeys.includes(stat.key) : false;

          let fill = COUNTRY_FILL;
          if (stat?.explored) fill = 'rgba(243,200,106,0.18)';
          if (isPinned) fill = 'rgba(255,255,255,0.12)';
          if (isHovered) fill = 'rgba(255,255,255,0.18)';
          if (isSelected) fill = 'rgba(255,59,59,0.42)';

          return (
            <path
              key={countryName || JSON.stringify(country.geometry)}
              d={path(country) ?? undefined}
              fill={fill}
              stroke={isSelected ? 'rgba(255,255,255,0.45)' : COUNTRY_BORDER}
              strokeWidth={isSelected ? 1.15 : 0.7}
              style={{
                transition: 'fill 220ms ease, stroke 220ms ease, opacity 220ms ease',
                filter: isSelected ? 'url(#stars-globe-glow)' : undefined,
                opacity: stat || isHovered ? 1 : 0.94,
              }}
              onMouseEnter={(event) => {
                setHoveredCountryName(countryName);
                setTooltipForCountry(countryName, event.clientX, event.clientY);
              }}
              onMouseMove={(event) => {
                setTooltipForCountry(countryName, event.clientX, event.clientY);
              }}
              onMouseLeave={() => {
                setHoveredCountryName(null);
                setTooltip(null);
              }}
              onClick={() => {
                const nextCountry = stat ?? getEmptyCountryStat(countryName);
                onCountrySelect(nextCountry);
              }}
            />
          );
        })}

        {markerData.map(({ country, projected, radius }) => {
          const isSelected = country.key === selectedCountryKey;
          return (
            <g
              key={country.key}
              transform={`translate(${projected[0]}, ${projected[1]})`}
              className="cursor-pointer"
              onMouseEnter={(event) => {
                setHoveredCountryName(country.globeName);
                setTooltipForCountry(country.globeName, event.clientX, event.clientY);
              }}
              onMouseMove={(event) => {
                setTooltipForCountry(country.globeName, event.clientX, event.clientY);
              }}
              onMouseLeave={() => {
                setHoveredCountryName(null);
                setTooltip(null);
              }}
              onClick={() => onCountrySelect(country)}
            >
              <circle
                r={radius + 5}
                fill={country.explored ? 'rgba(243,200,106,0.16)' : SOFT_GLOW}
                filter="url(#stars-marker-glow)"
              />
              <circle
                r={radius + (isSelected ? 2 : 0)}
                fill={isSelected ? ACCENT_RED : country.explored ? EXPLORED_GOLD : '#FFD2D2'}
                stroke="rgba(255,255,255,0.5)"
                strokeWidth={isSelected ? 1.4 : 0.9}
              />
              <circle
                r={Math.max(radius - 2, 1.5)}
                fill={isSelected ? '#FFE7E7' : OCEAN}
                opacity={0.95}
              />
            </g>
          );
        })}

        <path
          d={path(sphere) ?? undefined}
          fill="none"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth={1}
        />
      </svg>

      {tooltip && (
        <div
          className="pointer-events-none absolute z-20 hidden w-64 rounded-2xl border border-white/10 bg-[#0d121d]/95 p-4 shadow-2xl backdrop-blur-xl md:block"
          style={{
            left: Math.min(tooltip.x + 18, size - 272),
            top: Math.max(tooltip.y - 24, 12),
            boxShadow: '0 30px 60px rgba(0, 0, 0, 0.45), 0 0 30px rgba(255,59,59,0.12)',
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-mono text-[10px] uppercase tracking-[0.22em] text-white/45">
                Scene Index
              </p>
              <h3 className="mt-1 text-base font-semibold text-white">{tooltip.country.label}</h3>
            </div>
            <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white/55">
              {getFlagLabel(tooltip.country.flag)}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-white/6 bg-white/[0.03] p-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">Films</p>
              <p className="mt-1 text-lg font-semibold text-white">{tooltip.country.filmCount}</p>
            </div>
            <div className="rounded-xl border border-white/6 bg-white/[0.03] p-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">Avg Score</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {tooltip.country.filmCount > 0 ? tooltip.country.averageScore.toFixed(1) : '--'}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2 text-sm text-white/72">
            <p>
              Top genres:{' '}
              <span className="text-white">
                {tooltip.country.topGenres.length > 0
                  ? tooltip.country.topGenres.join(', ')
                  : 'No films indexed yet'}
              </span>
            </p>
            <p>
              Top films:{' '}
              <span className="text-white">
                {tooltip.country.topFilms.length > 0
                  ? tooltip.country.topFilms.slice(0, 3).map((film) => film.title).join(', ')
                  : 'No titles yet'}
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
