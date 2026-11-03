/**
 * Shapes of the two station services the form uses, as observed on
 * amtrak.com. Only the fields the tests read are listed.
 */

/** One entry of `/services/data.stations.json` (loaded by the home page). */
export interface StationRecord {
  code: string; // "NYP"
  name: string; // "New York, NY"
  autoFillName: string; // "New York, NY - Moynihan Train Hall (NYP)"
}

/** Reply of `/services/MapDataService/AutoCompleterArcgis/getResponseList?searchTerm=…`. */
export interface StationSearchReply {
  autoCompleterResponse: {
    autoCompleteList: Array<{
      displayName: string; // "Washington, DC - Union Station (WAS)"
      resultType: string; // "Station" or a location type
      stationCode?: string; // "WAS" for stations
    }>;
  };
}

export const STATION_LIST_URL = /\/services\/data\.stations\.json/;
export const STATION_SEARCH_URL = '/AutoCompleterArcgis/';
