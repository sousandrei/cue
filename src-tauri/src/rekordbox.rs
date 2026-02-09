use quick_xml::events::{BytesDecl, BytesEnd, BytesStart, Event};
use std::fs::File;
use std::path::Path;
use crate::db::entities::Song;

pub async fn export_xml(songs: Vec<Song>, library_path: &str) -> anyhow::Result<()> {
    let xml_path = Path::new(library_path).join("rekordbox.xml");

    let mut writer = quick_xml::Writer::new_with_indent(
        File::create(xml_path)?,
        b' ',
        2,
    );

    // Write declaration
    writer.write_event(Event::Decl(BytesDecl::new("1.0", Some("UTF-8"), None)))?;

    // Root element DJ_PLAYLISTS
    let mut root = BytesStart::new("DJ_PLAYLISTS");
    root.push_attribute(("Version", "1.0.0"));
    writer.write_event(Event::Start(root))?;

    // PRODUCT element
    let mut product = BytesStart::new("PRODUCT");
    product.push_attribute(("Name", "Cue"));
    product.push_attribute(("Version", "0.1.0"));
    product.push_attribute(("Company", "Cue"));
    writer.write_event(Event::Empty(product))?;

    // COLLECTION element
    let mut collection = BytesStart::new("COLLECTION");
    collection.push_attribute(("Entries", songs.len().to_string().as_str()));
    writer.write_event(Event::Start(collection))?;

    for song in songs {
        let mut track = BytesStart::new("TRACK");
        track.push_attribute(("TrackID", song.id.as_str()));
        track.push_attribute(("Name", song.title.as_str()));
        track.push_attribute(("Artist", song.artist.as_str()));
        if let Some(ref album) = song.album {
            track.push_attribute(("Album", album.as_str()));
        }
        track.push_attribute(("Kind", "MP3 File"));
        
        // Format Location as file URI
        let song_path = Path::new(library_path)
            .join("Songs")
            .join(&song.filename);
        let location = format!("file://localhost{}", song_path.to_string_lossy());
        track.push_attribute(("Location", location.as_str()));
        
        writer.write_event(Event::Empty(track))?;
    }

    writer.write_event(Event::End(BytesEnd::new("COLLECTION")))?;

    // Empty PLAYLISTS element (required by Rekordbox)
    writer.write_event(Event::Start(BytesStart::new("PLAYLISTS")))?;
    writer.write_event(Event::End(BytesEnd::new("PLAYLISTS")))?;

    writer.write_event(Event::End(BytesEnd::new("DJ_PLAYLISTS")))?;

    Ok(())
}
