DELETE 
FROM playlist_songs 
WHERE 
    playlist_id = ?1 
    AND song_id = ?2
