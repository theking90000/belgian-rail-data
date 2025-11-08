CREATE UNIQUE INDEX unique_api_key ON api_key(key);

CREATE TABLE permission (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
);

CREATE TABLE key_permission (
    api_key_id INTEGER REFERENCES api_key(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permission(id) ON DELETE CASCADE,
    PRIMARY KEY (api_key_id, permission_id)
);
