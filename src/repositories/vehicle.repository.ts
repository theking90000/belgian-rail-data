/**
 * VehicleRepository - Data access for Vehicle entity
 * --------------------------------------------------
 * Specializes BaseRepository for vehicle table. Extendable for advanced queries.
 */
import { BaseRepository } from '../db/baseRepository';
import type { DBConnection } from '../db/connection';
import type { Vehicle } from '../models/vehicle';

export class VehicleRepository extends BaseRepository<Vehicle> {
  constructor(connection: DBConnection) {
    super('vehicle', connection);
  }
}
