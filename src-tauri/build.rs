fn main() {
    tauri_build::build();
    if std::env::var("TARGET").is_ok_and(|target| target.ends_with("windows-msvc")) {
        // Rekordbox support links vendored SQLCipher/OpenSSL static objects.
        // Those static objects do not ship their build-directory PDB files.
        println!("cargo:rustc-link-arg=/IGNORE:4099");
    }
}
