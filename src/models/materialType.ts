/**
 * Model: MaterialType (material_type table)
 * ----------------------------------------------------------
 * Represents a type of train material/vehicle, including its features and capacities.
 * Used to describe the physical and functional characteristics of rolling stock units.
 */

/**
 * MaterialType
 *
 * Describes a specific type of train material, including amenities, seating, and technical details.
 */
export interface MaterialType {
  /** Unique, auto-incremented primary key (Database: material_type.id) */
  id: number;

  /** Type name (Database: material_type.type_name) */
  typeName: string;

  /** Sub-type name (Database: material_type.sub_type_name) */
  subTypeName: string;

  /** Whether the material has toilets (Database: material_type.has_toilets) */
  hasToilets: boolean;

  /** Whether second class has power outlets (Database: material_type.has_second_class_outlets) */
  hasSecondClassOutlets: boolean;

  /** Whether first class has power outlets (Database: material_type.has_first_class_outlets) */
  hasFirstClassOutlets: boolean;

  /** Whether the material has heating (Database: material_type.has_heating) */
  hasHeating: boolean;

  /** Whether the material has air conditioning (Database: material_type.has_airco) */
  hasAirco: boolean;

  /** Type of traction (Database: material_type.traction_type) */
  tractionType: string;

  /** Whether passengers can pass to the next unit (Database: material_type.can_pass_to_next_unit) */
  canPassToNextUnit: boolean;

  /** Number of first class seats (Database: material_type.seats_first_class) */
  seatsFirstClass: number;

  /** Number of coupe first class seats (Database: material_type.seats_coupe_first_class) */
  seatsCoupeFirstClass: number;

  /** Number of standing places in first class (Database: material_type.standing_places_first_class) */
  standingPlacesFirstClass: number;

  /** Number of second class seats (Database: material_type.seats_second_class) */
  seatsSecondClass: number;

  /** Number of coupe second class seats (Database: material_type.seats_coupe_second_class) */
  seatsCoupeSecondClass: number;

  /** Number of standing places in second class (Database: material_type.standing_places_second_class) */
  standingPlacesSecondClass: number;

  /** Length in meters (Database: material_type.length_in_meter) */
  lengthInMeter: number;

  /** Whether the material has semi-automatic interior doors (Database: material_type.has_semi_automatic_interior_doors) */
  hasSemiAutomaticInteriorDoors: boolean;

  /** Traction position (Database: material_type.traction_position) */
  tractionPosition: number;

  /** Whether the material has a PRM (Persons with Reduced Mobility) section (Database: material_type.has_prm_section) */
  hasPrmSection: boolean;

  /** Whether the material has priority places (Database: material_type.has_priority_places) */
  hasPriorityPlaces: boolean;

  /** Whether the material has a bike section (Database: material_type.has_bike_section) */
  hasBikeSection: boolean;
}
