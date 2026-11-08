fn main() {
    if std::env::var("TARGET").is_ok_and(|target| target.ends_with("windows-msvc")) {
        // OpenSSL static objects omit their build-directory PDB. Apply this
        // only to this crate's tests/examples; Cue handles its own final link.
        println!("cargo:rustc-link-arg=/IGNORE:4099");
    }
}
