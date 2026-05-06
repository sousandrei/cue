UPDATE songs SET
    title = ?1,
    artist = ?2,
    album = ?3,
    filename = ?4,
    source_url = ?5
WHERE 
    id = ?6;
