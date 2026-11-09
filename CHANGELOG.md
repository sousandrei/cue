# Changelog

## [1.7.0](https://github.com/sousandrei/cue/compare/v1.6.0...v1.7.0) (2026-11-09)


### Features

* **audio:** decode active tracks for responsive seeking ([9394cc0](https://github.com/sousandrei/cue/commit/9394cc0cc7f1342e42e18a48f1b70531defd31d0))
* **audio:** serve local library tracks for playback ([21a695d](https://github.com/sousandrei/cue/commit/21a695d1c79aec3d143b7828183f9eefcaf8d62e))
* **collection:** add Rekordbox metadata and reusable status UI ([bf6292d](https://github.com/sousandrei/cue/commit/bf6292d89c74364ed0636aa88db6e6c56432e913))
* **library:** add player with paused track loading ([6aefb5e](https://github.com/sousandrei/cue/commit/6aefb5ea3a5eaf30a08679f48fd392a1947bd479))
* **player:** add zoomable RGB waveform and song overview ([5d37c16](https://github.com/sousandrei/cue/commit/5d37c16eadb6373ba1aaa246d918bc137d40db07))
* **rekordbox:** add native workspace library ([b5d0f22](https://github.com/sousandrei/cue/commit/b5d0f220274c0a6cc4737bdde601a0ce69b289a1))
* **rekordbox:** expose saved waveforms and beat grids ([29de4cd](https://github.com/sousandrei/cue/commit/29de4cd72196826fe13d4f66bdc1a995a1deb6dc))
* **rekordbox:** reconcile Cue tags with the local library ([08ba6d6](https://github.com/sousandrei/cue/commit/08ba6d611d23c2d9dcf872d4b94bf02d684eafab))
* **ui:** balance vibrant accents with neutral ink surfaces ([8666853](https://github.com/sousandrei/cue/commit/86668538851a18daf1c80e44ec274951fa68cf44))
* **ui:** compose accessible music workflows from shared primitives ([74cca32](https://github.com/sousandrei/cue/commit/74cca3276fdeabe1a0a3c030286d8cae6fd4a369))
* **ui:** establish Base UI foundations and Rstest story harness ([e8a0900](https://github.com/sousandrei/cue/commit/e8a09008d1d3de02d12968070934b3436abd57f4))
* **waveform:** add a tested compositor rendering package ([7c244df](https://github.com/sousandrei/cue/commit/7c244dfdd5c8e2c4bf3ddc64815a9b02d8f42d6f))


### Bug Fixes

* **audio:** interpolate visual position against the display clock ([33f8e92](https://github.com/sousandrei/cue/commit/33f8e92eb51b68c612b8caba6c150a211e234565))
* **intake:** keep empty history compact during downloads ([49ef51f](https://github.com/sousandrei/cue/commit/49ef51f53de74fcaefa62c8c4468c2f94357fb11))
* **player:** capture seek shortcuts before slider handling ([998a4ba](https://github.com/sousandrei/cue/commit/998a4ba571e1586b8cac162236efceadd1100689))
* **player:** honor Space immediately after loading a track ([cf557b0](https://github.com/sousandrei/cue/commit/cf557b0da63db7c7aaa39ec5cb9d2dacdaea57d2))
* **rekordbox:** delegate writes to rbox and test orchestration ([7c1014c](https://github.com/sousandrei/cue/commit/7c1014cd0f9a1e652afc313e45936f86a6349c5c))
* **rekordbox:** keep only the newest three library backups ([1641a20](https://github.com/sousandrei/cue/commit/1641a20200a60e9494880706429de89e4c5db5b4))
* **rekordbox:** keep playlist ownership only in Cue's database ([d8ab2b3](https://github.com/sousandrei/cue/commit/d8ab2b3c68e1b55987d8a52e2a44afcdc4dd054c))
* **rekordbox:** match paths as text, ignoring case and Unicode form ([434b6b8](https://github.com/sousandrei/cue/commit/434b6b813b557aedbcebf2b72e53171193a65925))
* **rekordbox:** preserve waveform state during analysis refresh ([7602768](https://github.com/sousandrei/cue/commit/7602768f34e82ca908edf18a6efb28e54fafcf3a))
* **rekordbox:** reconcile the entire Cue playlist folder ([c0ec1e8](https://github.com/sousandrei/cue/commit/c0ec1e80f6009d75abae9b7ce4e7c60df5bf1432))
* **rekordbox:** serialize syncs with an OS file lock ([a7b9ecc](https://github.com/sousandrei/cue/commit/a7b9ecc2c2c4ec573c14eac74ebeda42f98d06b8))
* **rekordbox:** use one Rekordbox process check ([b1a2736](https://github.com/sousandrei/cue/commit/b1a27364c3a13e5047bb814e865559189b199e70))
* **ui:** contain scrolling within collection, activity, and preferences ([9ab9544](https://github.com/sousandrei/cue/commit/9ab9544ba0bd6c9e3fe9f08cec3ba89c95d9a23c))
* **ui:** preserve contrast in destructive states ([0720cd3](https://github.com/sousandrei/cue/commit/0720cd3c9161cc23f5d0c9ff96b141c7bd4e2725))
* **ui:** preserve download card space and refresh README tour ([94ca46a](https://github.com/sousandrei/cue/commit/94ca46a4219cfc0995d0055b52d14932b3326e45))
* **ui:** size notifications to their content ([7c10fa5](https://github.com/sousandrei/cue/commit/7c10fa5c64c9e92c6614217da09a51880424851f))


### Performance Improvements

* **library:** isolate collection rows from playback updates ([5c852e8](https://github.com/sousandrei/cue/commit/5c852e8055c88cc550ddeeb376f41f691bb95364))
* **player:** throttle inactive updates and keep one waveform loop ([dc355da](https://github.com/sousandrei/cue/commit/dc355daebeb8012a9ff589d9e7152e31af191b87))
* **rekordbox:** read a snapshot over one connection ([98b9600](https://github.com/sousandrei/cue/commit/98b96009bc05a7ae204e87ce4a1ea9e794d63123))
* **rekordbox:** reload songs only after they change ([43ff306](https://github.com/sousandrei/cue/commit/43ff3067b3372477e1b68c8ac9408a96b749d892))
* **waveform:** use compositor scrolling for playback ([3169a42](https://github.com/sousandrei/cue/commit/3169a42f7710eb2300849ee264a7403d15c6cea2))

## [1.6.0](https://github.com/sousandrei/cue/compare/v1.5.1...v1.6.0) (2026-09-08)


### Features

* ui polish ([89cfa22](https://github.com/sousandrei/cue/commit/89cfa223f14e96d640191dc06370b532ef27dfd9))


### Bug Fixes

* resolve Biome checks for dependency updates ([99f5053](https://github.com/sousandrei/cue/commit/99f50530c621c53c1d8256491448caf886aa328a))

## [1.5.1](https://github.com/sousandrei/cue/compare/v1.5.0...v1.5.1) (2026-07-18)


### Bug Fixes

* bump bundled tools versions ([3a62d7f](https://github.com/sousandrei/cue/commit/3a62d7f479e6438952bc808e4f557ea613e36ee0))

## [1.5.0](https://github.com/sousandrei/cue/compare/v1.4.1...v1.5.0) (2026-05-06)


### Features

* abstract tauri calls ([1a4d1f3](https://github.com/sousandrei/cue/commit/1a4d1f300b505cac66bf16a29bca9d1fb154be8d))
* implement tagging and migrate to rsbuild ([8edf2f8](https://github.com/sousandrei/cue/commit/8edf2f8ffd5d262bfa308510f4d7cec78a1b2466))
* move to rsbuild ([e923523](https://github.com/sousandrei/cue/commit/e92352362ff175096dfea1d8b13c3af3c53210ab))
* sync missing songs ([7e807ac](https://github.com/sousandrei/cue/commit/7e807ac165f358f3026b6e01cfb57d498b155d92))
* use baseui and create tauri provider ([6108a0f](https://github.com/sousandrei/cue/commit/6108a0fd6c6096934cc25bf18d2beda15f1348ff))

## [1.4.1](https://github.com/sousandrei/cue/compare/v1.4.0...v1.4.1) (2026-03-02)


### Bug Fixes

* bulk download urls ([19acd76](https://github.com/sousandrei/cue/commit/19acd76ae8d5bc315dc90463e82b3acd8e48315f))
* ffprobe binary install ([bf45ea3](https://github.com/sousandrei/cue/commit/bf45ea3497b063908b61a626ad0a23d42f0f4836))

## [1.4.0](https://github.com/sousandrei/cue/compare/v1.3.0...v1.4.0) (2026-02-17)


### Features

* lock versions to app release ([1f3f58b](https://github.com/sousandrei/cue/commit/1f3f58b9a5d7a2a1a4f9bd1e1958a47f341457fb))
* support macos intel as well ([1bfb811](https://github.com/sousandrei/cue/commit/1bfb811467e07b3ef3614c92d46eac8e52086662))


### Bug Fixes

* clippy issues ([ecc72ea](https://github.com/sousandrei/cue/commit/ecc72ea0d9db746e6c2ef07e1659052fc0935cce))
* ts linting ([7aa6709](https://github.com/sousandrei/cue/commit/7aa670994c399fce1cb834165669bf3ae6c0f816))
* use correct tauri env ([5f82952](https://github.com/sousandrei/cue/commit/5f82952cbeabb36d1f4734c4f33a70d3039441e7))

## [1.3.0](https://github.com/sousandrei/cue/compare/v1.2.0...v1.3.0) (2026-02-15)


### Features

* add logs button ([71b177e](https://github.com/sousandrei/cue/commit/71b177e4ea99d2b5e10f2e02ea7639c2e968212b))
* detailed progress status ([7382b35](https://github.com/sousandrei/cue/commit/7382b35814317e0136c4cd63d2eb12f82c9aac2b))


### Bug Fixes

* black terminal windows on windows ([c4185b3](https://github.com/sousandrei/cue/commit/c4185b3b5293e731fae6ba38f7a39b47d41b0198))
* events for refresh library and config ([286ea7f](https://github.com/sousandrei/cue/commit/286ea7fccb3a68e68d0893898e43d2d0e3ec56e4))
* linux extract tar.gz on ffmpeg ([cfc071b](https://github.com/sousandrei/cue/commit/cfc071b64f97bf58bbb16f8043537ea9ca3da8ea))
* non utf-8 output on yt-dlp ([5027708](https://github.com/sousandrei/cue/commit/502770823b9a5427ebab73a3ea06d6efd20fff0f))

## [1.2.0](https://github.com/sousandrei/cue/compare/v1.1.1...v1.2.0) (2026-02-09)


### Features

* better update logic ([d3d8480](https://github.com/sousandrei/cue/commit/d3d848051435526322375d4d4aec2596dbb8db86))


### Bug Fixes

* confirmation dialog on factory reset ([af82daf](https://github.com/sousandrei/cue/commit/af82dafd45a3940f33ad52e01cf9d5605934c0df))

## [1.1.1](https://github.com/sousandrei/cue/compare/v1.1.0...v1.1.1) (2026-02-09)


### Bug Fixes

* capabilities to restart ([798cb67](https://github.com/sousandrei/cue/commit/798cb67847b98709dafefcc08ce6d8c1c10ff8d8))
* max file name ([1553fc7](https://github.com/sousandrei/cue/commit/1553fc77d4ab299accd1ff39056dc8db0b61325f))
* process permissions ([423b6e8](https://github.com/sousandrei/cue/commit/423b6e8da8152471c7dc00ec96014624bacde044))

## [1.1.0](https://github.com/sousandrei/cue/compare/v1.0.2...v1.1.0) (2026-02-09)


### Features

* better bundling of dependencies ([793cd22](https://github.com/sousandrei/cue/commit/793cd220eb40c3f82ccbe9750c93b71ff4a024c6))
* bundle ffmpeg and bun ([52a5f6d](https://github.com/sousandrei/cue/commit/52a5f6d71afbcc9e0e4c23d5736cf78d49f7faa9))


### Bug Fixes

* allow update auto-restart ([ca31467](https://github.com/sousandrei/cue/commit/ca314676f1ea3b1fe37cc3a36ca103784405ca42))
* allow update auto-restart ([513840a](https://github.com/sousandrei/cue/commit/513840abb540f467bc9e1612c482ba79ebe6dd89))

## [1.0.2](https://github.com/sousandrei/cue/compare/v1.0.1...v1.0.2) (2026-02-09)


### Bug Fixes

* trigger release to publish updater config ([94eb911](https://github.com/sousandrei/cue/commit/94eb9113ad2bfe736490b34416557a745bc60533))

## [1.0.1](https://github.com/sousandrei/cue/compare/v1.0.0...v1.0.1) (2026-02-09)


### Bug Fixes

* release updater config ([c38d2d5](https://github.com/sousandrei/cue/commit/c38d2d5cbdb9fde2ce80524bbcb17c45f753e411))

## 1.0.0 (2026-02-09)


### Features

* add error toasts ([4b72b58](https://github.com/sousandrei/cue/commit/4b72b583f1d4676c096fafd64b8525a62df4e9d5))
* add setup screen ([13e8299](https://github.com/sousandrei/cue/commit/13e8299f686ff06972ef2bfbd3047b0a85a74698))
* add tanstack router ([0e343d3](https://github.com/sousandrei/cue/commit/0e343d388e1160de531877ec5c8087d6b305024e))
* auto updater ([181cf71](https://github.com/sousandrei/cue/commit/181cf714ca45b49658f76956348acdc010697625))
* avoid duplicated songs ([b8f2d8f](https://github.com/sousandrei/cue/commit/b8f2d8fe7ee2693e691e07c63db86a17e4eb124e))
* bulk import ([a4b027b](https://github.com/sousandrei/cue/commit/a4b027b3b3fd9195070c95e994df3779bd9fb967))
* clear buttons ([5484231](https://github.com/sousandrei/cue/commit/548423117a51ebcf4c91a505fa9cf103ff6e294c))
* config and library path ([0c9a042](https://github.com/sousandrei/cue/commit/0c9a042feff5d462904a0067886daf99e323ddd4))
* config menu ([e420ca2](https://github.com/sousandrei/cue/commit/e420ca255d6bae621c02333444023978a841ec3e))
* css improvements and component breakdown ([04b21cf](https://github.com/sousandrei/cue/commit/04b21cfe7254e27450dcfae63e0ce72f2644adc6))
* initial commit ([5d147e7](https://github.com/sousandrei/cue/commit/5d147e7de9ebc8b0b3be6ac0eb8247e7e493a618))
* make it prettier ([bd22d07](https://github.com/sousandrei/cue/commit/bd22d07ff1d5ac8014cb16bfc45ebe5a090019f7))
* minor ui tweaks ([b630d00](https://github.com/sousandrei/cue/commit/b630d007dc2963bda3fd1e7bcd624c6af98f7db2))
* move state to rust, ui is dumb ([c876a62](https://github.com/sousandrei/cue/commit/c876a623d78efaa5dd9a3aac421b996320405271))
* rename to cue and add rekordbox primitive xml ([804f126](https://github.com/sousandrei/cue/commit/804f126d8530263aef2aae7b6077b2a5185d6655))
* second pass on ui polish ([c89cc13](https://github.com/sousandrei/cue/commit/c89cc13ad3f34206330c8ab67979fb694e609587))
* simple library view and better commands ([36d1160](https://github.com/sousandrei/cue/commit/36d11603e9466378b4eeca48968c610655ff7b3a))
* simple sqlite ([e80bd87](https://github.com/sousandrei/cue/commit/e80bd876863eddf929715c329cd9b4601315048a))
* support playlists ([86895fd](https://github.com/sousandrei/cue/commit/86895fd4a0ac3b8ad5e7441ce663a557c370f3e8))
* treat download failed state ([c187f86](https://github.com/sousandrei/cue/commit/c187f861838bb88dc69c32ba54112b65561995c8))
* use better tables ([800d7f3](https://github.com/sousandrei/cue/commit/800d7f32721aaf26dc7f8963ec280592fc04849d))
* working dowload ([f457548](https://github.com/sousandrei/cue/commit/f457548745fbbde85c6cc204489027bd74c89d45))
* working download and metadata ([33a7f70](https://github.com/sousandrei/cue/commit/33a7f7033802edd0d3a53d584af792b2b9a8dd9c))
