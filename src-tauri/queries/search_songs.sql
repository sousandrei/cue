SELECT 
    id, 
    title, 
    artist, 
    album, 
    filename,
    source_url,
    tags
FROM songs 
WHERE 
    title LIKE ?1 
    OR artist LIKE ?1 
    OR album LIKE ?1
