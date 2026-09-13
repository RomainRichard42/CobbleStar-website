# Animated Star layers

Charmander Star uses four blue/cyan recolors of Cobblemon 1.8.0's native
`charmander_flame1.png` through `charmander_flame4.png`, at the original 10 fps.
The pack builder overrides the native `flame` layer only for `cobblestar-star`.
Normal and shiny variants remain unchanged. The native skeleton/UVs are retained.

Ship this directory alongside `dist`, `licenses` and `star-templates` when deploying
the API. Republish Charmander from Star Studio after deployment to rebuild the
downloadable pack. If the publish button is disabled, reimport the three ordinary
asset files and save a new draft first. Existing pack hashes are immutable and unchanged.
The ordinary three-file Star Studio import is sufficient; these frames are
included by the API, not uploaded in the static emissive PNG field.

Source assets: Cobblemon team, https://gitlab.com/cable-mc/cobblemon
License: ../licenses/Cobblemon.txt. Recolor: CobbleStar.
Reproducible workspace script: scripts/BuildCharmanderStarFlame.java.
