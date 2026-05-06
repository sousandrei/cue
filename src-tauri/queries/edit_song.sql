UPDATE songs SET
    title = ?1,
    artist = ?2,
    album = ?3,
    filename = ?4,
    source_url = ?5,
    tags = ?6
WHERE 
    id = ?7;
