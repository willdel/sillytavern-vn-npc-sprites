# VN NPC Sprites for SillyTavern

A third-party UI extension that displays lorebook-driven NPCs in Visual Novel mode using matching character-card sprite folders, without loading those cards into the chat.

## Features

- Persistent, per-chat scene roster with up to five characters.
- Deterministic entrance, exit, location, and explicit-speaker tracking.
- Active-speaker focus and multi-character layout.
- Expression/action sprites with character-card avatar fallback.
- Editable aliases and action definitions.
- Automatic background selection from structured Location headers.
- Manual scene and action correction controls.
- No SillyTavern core modifications or external service dependency.

## Install

In SillyTavern, open **Extensions -> Install Extension** and paste:

```text
https://github.com/willdel/sillytavern-vn-npc-sprites
```

Reload SillyTavern, enable Visual Novel mode, and configure **Extensions -> VN NPC Sprites**.

Character Expressions must already contain sprites for the matching card name. Transparent sprite images work best at a **2:3 aspect ratio**. Other ratios are supported but may leave more empty space or appear smaller in multi-character scenes.

Emotion changes reuse the classifier selected in SillyTavern's built-in **Character Expressions** settings. Configure that classifier there; selecting `None` leaves the configured neutral fallback in use. In single-character scenes the whole visible response is classified. In multi-character scenes each character's named narration is classified separately and retained until it changes.

## Scene tracking

The extension keeps a separate persistent roster for each chat. Explicit speakers and physical-presence cues add characters; exit cues remove them. A location change clears the old roster before adding characters at the new location. Ordinary conversational references do not add sprites.

Use **Add to scene**, **Remove from scene**, or **Clear scene** when prose is ambiguous.

## Action sprites

Action definitions are editable in extension settings:

```text
walking | temporary | 10 = walk, walks, walked, walking
sitting | persistent | 20 = sit down, sits down, sat down, seated
kissing | temporary | 100 = kiss, kisses, kissed, kissing
```

The action name on the left must match the sprite label/filename. Add custom actions by adding another line; no extension update is required.

The optional numeric priority selects the most important action when several occur in one response. Higher numbers win; tied actions use the one mentioned latest. Definitions without a priority remain valid and default to `0`.

- `temporary`: lasts for the current analyzed turn, then returns to the prior persistent action or neutral.
- `persistent`: remains until replaced by another persistent action or manually reset.

Sprite resolution order is detected action, configured neutral/default expression, first available sprite, then character-card avatar. Use **Reset action** for manual correction.

## Dynamic backgrounds

Upload backgrounds normally in SillyTavern, then add exact mappings in the extension settings:

```text
Bedroom = bedroom.webp
Driftline Beach - North Cove Path = north-cove.webp
Old Market District - General Store = general-store.webp
```

When an AI message contains a structured `Location` header, the extension selects the mapped file through SillyTavern's built-in `/bg` command. Matching ignores capitalization, repeated spaces, and typographic dash variants, but otherwise remains exact. This prevents a location that is merely mentioned in narration from changing the background. If no mapping exists, the current background remains unchanged and the test status reports the unmatched location.

## Architecture

- `detection.js`: character names and aliases.
- `scene-tracker.js`: entrances, exits, locations, and roster transitions.
- `action-tracker.js`: configurable action parsing and state transitions.
- `background-tracker.js`: exact Location-header background mappings.
- `sprites.js`: sprite inventory and fallback selection.
- `renderer.js`: five-character scene layout and active-speaker focus.
- `index.js`: SillyTavern events, settings, persistence, and orchestration.

## Development

Run `npm test` with Node.js 20 or newer.

Built against SillyTavern's `release` branch in August 2026. License: GPL-3.0.

