SELECT 
    id, 
    title, 
    artist, 
    album, 
    filename
FROM songs 
WHERE 
    title LIKE ?1 
    OR artist LIKE ?1 
    OR album LIKE ?1
