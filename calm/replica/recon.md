# Recon: Infinity Loop: Relaxing Puzzle (Android, com.balysv.loop)

Source: public Play Store listing only. No APK, code, art, sounds, or copy taken.

Core loop: tap a tile to rotate it 90°; the level is done when every line
connects (no loose ends). Endless levels, no timer, relaxing tone. Second mode
("dark"): disconnect everything. The original has ads and in-app purchases;
Calm has none.

| ID | screen | purpose | states |
| --- | --- | --- | --- |
| S01 | Menu | pick mode, see level, sound/vibration | first run, returning |
| S02 | Board | rotate tiles, prev/next level, restart | playing, solved |

| feature | priority | clone |
| --- | --- | --- |
| Tap to rotate with animation | must | yes |
| Infinite deterministic levels | must | yes |
| Solved detection (any valid solution) | must | yes |
| Dark mode: disconnect all | should | yes (Gelap) |
| Daily challenge | should | yes (Tantangan harian, streak) |
| HEX board (sister app) | should | yes (Hex) |
| ENERGY: light bulbs from a source (sister app) | should | yes (Energi) |
| Hints (paid in original) | could | yes, free and unlimited |
| Progress saved on device | must | yes |
| Sound and vibration toggles | should | yes |
| Replay earlier levels | could | yes |
| Google Play Games cloud save | skip | needs an account and services |
| Wear OS | skip | out of scope |
| Ads / purchases | skip | user requirement: everything free |
