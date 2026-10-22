import { BadRequestException, Injectable, Logger } from '@nestjs/common';

export type ResolvedLocation = {
  latitude: number;
  longitude: number;
  /** Link to store as the project pin (the original Google Maps link, or one built from the coordinates) */
  pinUrl: string;
  place: {
    label: string;
    city: string | null;
    region: string | null;
    country: string | null;
  } | null;
};

const COORDS_TEXT = /^\s*(-?\d{1,2}(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:[.,]\d+)?)\s*$/;

// Google Maps URL patterns, most precise first: the dropped pin (!3d/!4d) beats the viewport (@)
const URL_PATTERNS: RegExp[] = [
  /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
  /[?&](?:q|query|ll|destination|center|daddr)=(-?\d+(?:\.\d+)?)(?:,|%2C)\s*(-?\d+(?:\.\d+)?)/i,
  /\/place\/(-?\d+(?:\.\d+)?)(?:,|%2C)\s*(-?\d+(?:\.\d+)?)/i,
  /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
];

const MAX_REDIRECTS = 5;

/** Only Google Maps hosts may be fetched (keeps the endpoint from being used to reach arbitrary URLs) */
function isGoogleMapsHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === 'maps.app.goo.gl' ||
    host === 'goo.gl' ||
    host === 'g.co' ||
    /(^|\.)google\.[a-z.]{2,6}$/.test(host)
  );
}

function validCoords(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

function round(value: number): number {
  return Math.round(value * 1e7) / 1e7;
}

@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);

  async resolve(input: string): Promise<ResolvedLocation> {
    const text = (input ?? '').trim();
    if (!text) throw new BadRequestException('Podaj link Google Maps lub współrzędne.');

    // Plain "lat, lng"
    const plain = text.match(COORDS_TEXT);
    if (plain) {
      const lat = Number(plain[1].replace(',', '.'));
      const lng = Number(plain[2].replace(',', '.'));
      if (!validCoords(lat, lng)) throw new BadRequestException('Nieprawidłowe współrzędne.');
      return this.withPlace(round(lat), round(lng), null);
    }

    let url: URL;
    try {
      url = new URL(text);
    } catch {
      throw new BadRequestException('Wklej link z Google Maps (np. https://maps.app.goo.gl/…) lub współrzędne „54.352, 18.646”.');
    }
    if (!['http:', 'https:'].includes(url.protocol) || !isGoogleMapsHost(url.hostname)) {
      throw new BadRequestException('Obsługiwane są tylko linki Google Maps.');
    }

    const coords = this.coordsFromUrl(url.toString()) ?? (await this.coordsFromShortLink(url));
    if (!coords) {
      throw new BadRequestException('Nie udało się odczytać współrzędnych z linku. Upuść pinezkę w Google Maps i skopiuj link „Udostępnij”.');
    }
    return this.withPlace(round(coords.lat), round(coords.lng), text);
  }

  private coordsFromUrl(value: string): { lat: number; lng: number } | null {
    const decoded = decodeURIComponent(value);
    for (const pattern of URL_PATTERNS) {
      const match = decoded.match(pattern);
      if (match) {
        const lat = Number(match[1]);
        const lng = Number(match[2]);
        if (validCoords(lat, lng)) return { lat, lng };
      }
    }
    return null;
  }

  /** Follows redirects of short links (maps.app.goo.gl/…) manually, staying on Google hosts */
  private async coordsFromShortLink(start: URL): Promise<{ lat: number; lng: number } | null> {
    let current = start;
    for (let hop = 0; hop < MAX_REDIRECTS; hop++) {
      let response: Response;
      try {
        response = await fetch(current, {
          redirect: 'manual',
          signal: AbortSignal.timeout(6000),
          headers: { 'User-Agent': 'Mozilla/5.0 (ERP location resolver)' },
        });
      } catch (error) {
        this.logger.warn(`Resolving ${current.hostname} failed: ${(error as Error).message}`);
        return null;
      }

      const location = response.headers.get('location');
      if (response.status >= 300 && response.status < 400 && location) {
        const next = new URL(location, current);
        const fromNext = this.coordsFromUrl(next.toString());
        if (fromNext) return fromNext;
        if (!isGoogleMapsHost(next.hostname)) return null;
        current = next;
        continue;
      }

      // Final page: coordinates are often embedded in the HTML (meta tags / preview URLs)
      const body = await response.text().catch(() => '');
      return this.coordsFromUrl(body.slice(0, 200_000));
    }
    return null;
  }

  private async withPlace(lat: number, lng: number, link: string | null): Promise<ResolvedLocation> {
    return {
      latitude: lat,
      longitude: lng,
      pinUrl: link ?? `https://www.google.com/maps?q=${lat},${lng}`,
      place: await this.reverseGeocode(lat, lng),
    };
  }

  /** Place name from OpenStreetMap Nominatim; null when the service is unavailable */
  private async reverseGeocode(lat: number, lng: number): Promise<ResolvedLocation['place']> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=14&addressdetails=1&accept-language=pl&lat=${lat}&lon=${lng}`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(6000),
        headers: { 'User-Agent': 'ERP-ISPIK/1.0 (project location lookup)' },
      });
      if (!response.ok) return null;
      const data = (await response.json()) as {
        display_name?: string;
        address?: Record<string, string>;
      };
      const a = data.address ?? {};
      const city = a.city ?? a.town ?? a.village ?? a.municipality ?? a.hamlet ?? a.county ?? null;
      const region = a.state ?? a.region ?? null;
      const country = a.country ?? null;
      const label = [city, a.county && a.county !== city ? a.county : null, region, country]
        .filter(Boolean)
        .join(', ');
      return { label: label || data.display_name || '', city, region, country };
    } catch (error) {
      this.logger.warn(`Reverse geocoding failed: ${(error as Error).message}`);
      return null;
    }
  }
}
