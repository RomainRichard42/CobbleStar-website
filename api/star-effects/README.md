# Shared Star presentation pack

The trusted manifest lists every resource included by buildStarPack, even with zero Pokemon variants. Deployment must copy this folder beside dist. Particle effects use Cobblemon 1.8 Snowstorm; vanilla sound events are referenced, not redistributed. The client mod 6.39.40 supplies only the Star appearance trigger and /starfx test.

Edit particle JSON, sounds.json or the blue sprite here and deploy the API. The first authenticated server sync automatically rebuilds the pack from published Pokemon assets only; unfinished drafts are never promoted. Concurrent syncs share one rebuild, failures preserve the previous pack and retry after 60 seconds. Identical resources keep the same deterministic hash. The existing required resource-pack delivery handles joins and updates. The Star Studio button remains an optional manual rebuild.

The standalone test ZIP excludes Pokemon skins. Generate it after building the API:

    node scripts/export-star-effects.mjs <output.zip>
