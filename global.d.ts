interface RideData {
  updatedAt: string;
  lands: {
    id: number;
    name: string;
    rides: {
      id: number;
      name: string;
      is_open: boolean;
      wait_time: number;
      last_updated: string;
    }[];
  }[];
}

interface HistoricalRideData {
  lands: {
    id: number;
    name: string;
    rides: {
      id: number;
      name: string;
      history: {
        is_open: boolean;
        wait_time: number;
        last_updated: string;
      }[];
    }[];
  }[];
}

interface RideData {
  updatedAt: string;
  dca: HistoricalRideData;
  disneyland: HistoricalRideData;
}
