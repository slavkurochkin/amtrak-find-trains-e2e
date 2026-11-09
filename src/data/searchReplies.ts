import fs from 'node:fs';
import path from 'node:path';
import { addDays, toApiFormat, type CalendarDate } from '../utils/dates';

/**
 * A real reply from Amtrak's search service, saved from one manual search in
 * a normal browser (one-way NYP -> WAS, 1 adult, departing 2026-11-16).
 * Trimmed to its first 3 trains; everything else is as Amtrak sent it.
 *
 * Tests feed it to the page in place of the live service (which blocks
 * automated searches), so the results page can be checked without any
 * search reaching Amtrak.
 */
const FILE = path.join(__dirname, 'search-replies', 'one-way-NYP-WAS.json');
const RECORDED_ON = '2026-11-16';
const RECORDED_NEXT_DAY = '2026-11-17'; // the overnight train arrives the next day

export interface Train {
  /** "111 Northeast Regional", as the results page names it. */
  name: string;
  /** Departure time as the results page shows it, e.g. "4:50a". */
  departs: string;
  /** Cheapest fare in whole dollars, e.g. "82". */
  lowestFare: string;
}

export interface SavedSearchReply {
  /** The reply body, with its dates moved to the requested day. */
  body: string;
  /** The trains in the reply, in order, as the results page should list them. */
  trains: Train[];
}

const day = (d: CalendarDate) => toApiFormat(d).slice(0, 10);

/**
 * The saved NYP -> WAS reply, moved to `departDate` so it matches what the
 * test searched for (tests always use dates relative to today).
 */
export function savedSearchReply(departDate: CalendarDate): SavedSearchReply {
  const body = fs
    .readFileSync(FILE, 'utf8')
    .replaceAll(RECORDED_NEXT_DAY, day(addDays(departDate, 1)))
    .replaceAll(RECORDED_ON, day(departDate));
  return { body, trains: trainsIn(JSON.parse(body)) };
}

interface ReplyJson {
  data: {
    journeySolutionOption: {
      journeyLegs: Array<{
        journeyLegOptions: Array<{
          origin: { schedule: { departureDateTime: string } };
          travelLegs: Array<{ travelService: { number: string; name: string } }>;
          reservableAccommodations: Array<{ accommodationFare: { dollarsAmount: { total: string } } }>;
        }>;
      }>;
    };
  };
}

function trainsIn(reply: ReplyJson): Train[] {
  return reply.data.journeySolutionOption.journeyLegs[0].journeyLegOptions.map((option) => {
    const service = option.travelLegs[0].travelService;
    const fares = option.reservableAccommodations.map((a) => Number(a.accommodationFare.dollarsAmount.total));
    return {
      name: `${service.number} ${service.name}`,
      departs: toCardTime(option.origin.schedule.departureDateTime),
      lowestFare: String(Math.min(...fares)),
    };
  });
}

/** "2026-11-16T04:50:00" -> "4:50a", the results page's time format. */
function toCardTime(isoDateTime: string): string {
  const [h, m] = isoDateTime.slice(11, 16).split(':').map(Number);
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')}${h < 12 ? 'a' : 'p'}`;
}
