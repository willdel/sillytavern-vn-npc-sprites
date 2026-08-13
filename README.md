# VN NPC Sprites for SillyTavern

An experimental third-party UI extension that routes an NPC named inside a narrator/GM response to that NPC's existing Character Expressions sprite folder, then displays the sprite in Visual Novel mode without adding the NPC card to the chat.

## v0.1 scope

- Matches against character card names already present in the SillyTavern character library.
- Prefers explicit speaker lines such as `Shannon: Hello` or `Shannon â€” Hello`.
- Optionally falls back when exactly one card name is mentioned anywhere in the message.
- Supports deterministic aliases such as `Ms. Carter = Shannon`.
- Loads sprites through SillyTavern's existing `/api/sprites/get` endpoint.
- Prefers `neutral` (configurable), then `neutral`, then `default`, then the first available sprite.
- Shows one NPC in desktop Visual Novel mode and removes it when the next message has no unambiguous match.

This release does not classify emotions, infer scene entrances/exits, read lorebook prose semantically, or show multiple sprites. Those are intentionally deferred.

## Install

SillyTavern installs third-party extensions from Git repository URLs. Put this folder in its own Git repository and use **Extensions â†’ Install Extension**, or copy the unzipped folder to:

- all users: `SillyTavern/public/scripts/extensions/third-party/sillytavern-vn-npc-sprites`
- one user: the user's `extensions/sillytavern-vn-npc-sprites` data directory

Restart/reload SillyTavern. Enable **Visual Novel Mode** in User Settings, open **Extensions â†’ VN NPC Sprites**, and click **Test latest AI message**.

Character Expressions must already have sprites for the matching card name. Example: a card named `Shannon` should resolve from the same sprite folder used by Character Expressions.

## Scene tracking

The extension keeps a separate persistent roster for each chat. Explicit speakers and physical-presence cues add characters; exit cues remove them. A location change clears the old roster before adding characters detected at the new location. Ordinary conversational references do not add sprites.

Use the Current Scene controls to add, remove, or clear characters when prose is ambiguous. Up to five tracked characters are rendered.

Lorebook/world-info entries can cause the model to emit NPC names, but v0.1 does not parse world-info records directly. A lorebook name must match a card name, or be mapped in Aliases.

## Architecture roadmap

- `detection.js`: replaceable deterministic speaker/name resolver.
- `sprites.js`: sprite inventory and state-selection boundary; action labels such as `walking`, `eating`, and `sleeping` can use the same endpoint.
- `scene-tracker.js`: deterministic entrances, exits, locations, and persistent roster transitions.
- `renderer.js`: isolated five-character scene layer with active-speaker focus.
- `index.js`: SillyTavern events, settings, and orchestration.

Planned next stages: expanded tracking rules, generalized action-state classification, and outfit-aware sprite folders.

## Development

Run `npm test` with Node.js 20 or newer. Tests cover explicit speakers, word boundaries, ambiguity, mention fallback, and aliases.

## Compatibility and safety

Built against the current SillyTavern `release` branch extension API in August 2026. No SillyTavern core files are modified. The extension makes only same-origin sprite-list requests and has no external network dependency.

License: AGPL-3.0-or-later.
