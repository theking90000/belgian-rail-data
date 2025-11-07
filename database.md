# Database Organization and Models

This document describes the improved, normalized data model for the Belgian Rail Data tracker, including the conceptual, logical, and physical (SQL) schema.

---

## 1. Conceptual Model (MCD)

**Entities:**
- **TrainRun**: An instance of a train on a given day
- **TrainStop**: A stop of a TrainRun at a Station
- **TrainComposition**: The set of vehicles/cars for a TrainRun
- **Vehicle**: Locomotive or carriage, if detailed stock is tracked
- **Station**: Belgian railway station (named and coded)
- **TrackedTrain**: Monitored trains
- **ConnectionQuery**: Saved route search (from, to, filters)
- **ConnectionResult**: The results of a ConnectionQuery
- **ApiKey**: API credentials
- **LogEntry**: System/API/fetch/error logs

### Relationships:
- TrainRun → many TrainStops, one TrainComposition
- TrainStop → Station
- ConnectionQuery → many ConnectionResults

---

## 2. Logical Model (MLD)

| Table                | Attributes                                                                                                  |
|----------------------|-------------------------------------------------------------------------------------------------------------|
| station              | id (PK), name, code (unique), latitude, longitude                                                          |
| train_run            | id (PK), train_number, departure_station_id (FK), arrival_station_id (FK), planned_departure, planned_arrival, actual_departure, actual_arrival |
| train_stop           | id (PK), run_id (FK), station_id (FK), stop_sequence, scheduled_arrival, actual_arrival, scheduled_departure, actual_departure, platform, delay_sec, occupancy_pct |
| train_composition    | id (PK), run_id (FK, unique), observed_at, json_composition                                                 |
| tracked_train        | id (PK), train_number, enabled                                                                              |
| connection_query     | id (PK), from_station_id (FK), to_station_id (FK), filters, enabled                                         |
| connection_result    | id (PK), query_id (FK), searched_at, result_json                                                            |
| api_key              | id (PK), descriptor, key                                                                                    |
| log_entry            | id (PK), log_time, log_type, entity_id, message, status_code, details                                       |
| vehicle              | id (PK), vehicle_number, type, description                                                                  |

- **All relevant foreign keys are marked.**
- **JSON columns** are used for complex or evolving data (composition, search result, details).
- **DATETIME** types for all date/time fields for accuracy and queryability.

---

## 3. Physical Model (MPD/SQL)

See the migration file for the proposed physical schema.

### SQL Migration Example (for SQLite/PostgreSQL/MySQL):

```sql
-- See migrations/001.sql for the schema definition.
```

---

## Further Notes

- This model enables normalized, high-integrity analytics and robust tracking/history for rail data.
- All data access should enforce foreign keys and proper types for data quality.
- Schema can be extended for multi-user or additional analytics features if needed.
