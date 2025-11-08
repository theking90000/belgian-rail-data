ALTER TABLE tracked_train 
    ADD COLUMN tracked_since DATETIME;

UPDATE tracked_train
    SET tracked_since = (
        strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    );