
export interface Package {
  id: string;
  weight: number;
  type: 'plastic_bag' | 'box' | 'envelope' | 'large_box';
  recipient: string;
  instructions: string;
}

export interface Stop {
  address: string;
  city: string;
  packages: Package[];
}

export interface RouteData {
  totalStops: number;
  totalPackages: number;
  stops: {
    [key: number]: Stop;
  };
}

export interface DriverData {
  transponderID: string;
  dspAccount: string;
  vehicleVIN: string;
  driverName: string;
  routeID: string;
  pickupArea: string;
}

export interface AppNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  time: string;
}

export interface EmergencyAlert {
  title: string;
  message: string;
  onRespond: (response: 'ok' | 'need_help') => void;
}

export type Screen = 'itinerary' | 'notifications';
export type ItineraryView = 'list' | 'map' | 'summary';

// Represents a package with its associated stop info for modal display
export interface SelectedPackageInfo extends Package {
  stopInfo: Stop;
}
