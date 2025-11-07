/**
 * All IRail API DTOs/types for type-safety and reuse
 */

export type VehicleResponse = {
    version: string;
    timestamp: string;
    vehicle: string;
    vehicleinfo: {
        name: string;
        shortname: string;
        number: string;
        type: string;
        locationX: string;
        locationY: string;
        '@id': string;
    };
    stops: {
        number: string;
        stop: Array<{
            id: string;
            station: string;
            stationinfo: {
                '@id': string;
                id: string;
                name: string;
                locationX: string;
                locationY: string;
                standardname: string;
            };
            time: string;
            platform: string;
            platforminfo: { name: string; normal: string };
            scheduledDepartureTime: string;
            scheduledArrivalTime: string;
            delay: string;
            canceled: string;
            departureDelay: string;
            departureCanceled: string;
            arrivalDelay: string;
            arrivalCanceled: string;
            left: string;
            arrived: string;
            isExtraStop: string;
            occupancy?: { '@id': string; name: string };
            departureConnection?: string;
        }>;
    };
};

export type CompositionResponse = {
    version: string;
    timestamp: string;
    composition: {
        segments: {
            number: string;
            segment: Array<{
                id: string;
                origin: {
                    locationX: string;
                    locationY: string;
                    id: string;
                    name: string;
                    '@id': string;
                    standardname: string;
                };
                destination: {
                    locationX: string;
                    locationY: string;
                    id: string;
                    name: string;
                    '@id': string;
                    standardname: string;
                };
                composition: {
                    source: string;
                    units: {
                        number: string;
                        unit: Array<{
                            id: string;
                            materialType: { parent_type: string; sub_type: string; orientation: string };
                            hasToilets: string;
                            hasTables: string;
                            hasSecondClassOutlets: string;
                            hasFirstClassOutlets: string;
                            hasHeating: string;
                            hasAirco: string;
                            materialNumber: string;
                            tractionType: string;
                            canPassToNextUnit: string;
                            standingPlacesSecondClass: string;
                            standingPlacesFirstClass: string;
                            seatsCoupeSecondClass: string;
                            seatsCoupeFirstClass: string;
                            seatsSecondClass: string;
                            seatsFirstClass: string;
                            lengthInMeter: string;
                            hasSemiAutomaticInteriorDoors: string;
                            hasLuggageSection: string;
                            materialSubTypeName: string;
                            tractionPosition: string;
                            hasPrmSection: string;
                            hasPriorityPlaces: string;
                            hasBikeSection: string;
                        }>;
                    };
                };
            }>;
        };
    };
};

export type ConnectionsResponse = {
    version: string;
    timestamp: number;
    connection: Array<{
        id: number;
        departure: any;
        arrival: any;
        duration: number;
        alerts: any;
        vias: any;
    }>;
};

export type ListConnections = {
    from: string;
    to: string;
    date?: string;
    time?: string;
};

export type StationPoint = {
    station: string;
    time: string;
    date: string;
    platform: string;
    delay: number;
};

export type Connection = {
    from: StationPoint;
    to?: StationPoint;
    vehicle: string;
};

export type DateTime = {
    time: string;
    date: string;
};