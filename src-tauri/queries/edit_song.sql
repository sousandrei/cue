UPDATE songs 
SET 
    title = ?1, 
    artist = ?2, 
    album = ?3, 
    file_path = ?4
WHERE 
    id = ?5
