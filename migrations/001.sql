-- Migration 001: Initial normalized schema for Belgian Rail Data

CREATE TABLE station (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  latitude REAL,
  longitude REAL
);

CREATE TABLE train_run (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  train_number TEXT NOT NULL,
  departure_station_id INTEGER REFERENCES station(id),
  arrival_station_id INTEGER REFERENCES station(id),
  planned_departure DATETIME NOT NULL,
  planned_arrival DATETIME NOT NULL,
  actual_departure DATETIME,
  actual_arrival DATETIME
);

CREATE TABLE train_stop (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER REFERENCES train_run(id),
  station_id INTEGER REFERENCES station(id),
  stop_sequence INTEGER NOT NULL,
  scheduled_arrival DATETIME NOT NULL,
  actual_arrival DATETIME,
  scheduled_departure DATETIME NOT NULL,
  actual_departure DATETIME,
  platform TEXT,
  delay_sec INTEGER,
  occupancy_pct INTEGER
);

CREATE TABLE train_composition (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER REFERENCES train_run(id) UNIQUE,
  observed_at DATETIME NOT NULL,
  json_composition JSON
);

CREATE TABLE tracked_train (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  train_number TEXT NOT NULL,
  enabled BOOLEAN DEFAULT 1
);

CREATE TABLE connection_query (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_station_id INTEGER REFERENCES station(id),
  to_station_id INTEGER REFERENCES station(id),
  filters JSON,
  enabled BOOLEAN DEFAULT 1
);

CREATE TABLE connection_result (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query_id INTEGER REFERENCES connection_query(id),
  searched_at DATETIME NOT NULL,
  result_json JSON
);

CREATE TABLE api_key (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  descriptor TEXT,
  key TEXT NOT NULL
);

CREATE TABLE log_entry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  log_time DATETIME NOT NULL,
  log_type TEXT NOT NULL,
  entity_id TEXT,
  message TEXT NOT NULL,
  status_code INTEGER,
  details JSON
);

CREATE TABLE vehicle (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_number TEXT NOT NULL,
  type TEXT,
  description TEXT
);
