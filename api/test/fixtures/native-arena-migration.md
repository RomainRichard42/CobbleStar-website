# Native migration fixture provenance

`native-arena-migration.json` was exported by `ArenaDurableMigrationTest` using the production Java `ArenaCatalog.loadFile` and `ArenaBridgeProtocol.snapshot` implementations. Its original catalogue is the actual isolated CobbleStar 6.24 server's `config/cobblestar-arenas.json` (no credentials or player data); migrated teams are not a separately maintained web example.

The `nativeRuntime` field reproduces the five-field 6.26 contract, including `worldStatus`. The optional `ARENA_NATIVE_WIRE_REPORT` test additionally consumes an actual dedicated-server probe capture (`arenaWebContent` + `arenaWebStatus`, or the newer `arenaWebStatusStartup` / `arenaWebStatusOccupied` captures) exported with `ArenaNativeWireExport`, without replacing those snapshots. That optional test is not an in-game visual test.
