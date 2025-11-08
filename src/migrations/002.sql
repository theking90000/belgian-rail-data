CREATE TABLE material_type (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    type_name TEXT,
    sub_type_name TEXT,

    has_toilets BOOLEAN,
    has_second_class_outlets BOOLEAN,
    has_first_class_outlets BOOLEAN,
    has_heating BOOLEAN,
    has_airco BOOLEAN,
    traction_type TEXT,
    can_pass_to_next_unit BOOLEAN,
    seats_first_class INTEGER,
    seats_coupe_first_class INTEGER,
    standing_places_first_class INTEGER,
    seats_second_class INTEGER,
    seats_coupe_second_class INTEGER,
    standing_places_second_class INTEGER,
    length_in_meter INTEGER,
    has_semi_automatic_interior_doors BOOLEAN,
    traction_position INTEGER,
    has_prm_section BOOLEAN,
    has_priority_places BOOLEAN,
    has_bike_section BOOLEAN,

    CONSTRAINT unique_type UNIQUE (type_name, sub_type_name)
);

CREATE TABLE material_unit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    material_type_id INTEGER REFERENCES material_type(id),
    unit_number TEXT,

    CONSTRAINT unique_unit UNIQUE (material_type_id, unit_number)
);

DROP TABLE vehicle;
DROP TABLE train_composition;

CREATE TABLE train_composition_segment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    run_id INTEGER REFERENCES train_run(id) UNIQUE,
    origin_station_id INTEGER REFERENCES station(id),
    destination_station_id INTEGER REFERENCES station(id)
);

CREATE TABLE train_composition_unit (    
    segment_id INTEGER REFERENCES train_composition_segment(id),
    unit_id INTEGER REFERENCES material_unit(id),

    unit_sequence INTEGER,

    PRIMARY KEY (segment_id, unit_id)
);