# VN NPC Sprites for SillyTavern

A third-party UI extension that routes an NPC named inside a narrator/GM response to that NPC's existing Character Expressions sprite folder, then displays the sprite in Visual Novel mode without adding the NPC card to the chat.

## v0.1 scope

- Matches character card names already present in the SillyTavern character library.
- Prefers explicit speaker lines such as `Shannon: Hello` or `Shannon — Hello`.
- Optionally falls back when exactly one card name is mentioned.
- Supports deterministic aliases such as `Ms. Carter = Shannon`.
- Loads sprites through SillyTavern's existing `/api/sprites/get` endpoint.
- Shows one NPC in desktop Visual Novel mode.
- Does not modify SillyTavern core.

This release intentionally does not classify emotions, infer scene entrances/exits, parse lorebook prose semantically, or show multiple sprites.

## Install

In SillyTavern, open **Extensions → Install Extension** and paste:

```text
https://github.com/willdel/sillytavern-vn-npc-sprites
```

Reload SillyTavern, enable **Visual Novel Mode**, and configure **Extensions → VN NPC Sprites**.

Character Expressions must already contain sprites for the matching card name. A lorebook name must match a card name or be mapped in the Aliases setting.

## Detection rules

1. The longest matching card name or alias at the start of a line followed by `: `, `—`, `–`, or `-` wins.
2. If enabled, mention fallback succeeds only when all detected names resolve to one card.
3. Otherwise the sprite layer is cleared to avoid guessing.

## Architecture roadmap

- `detection.js`: replaceable speaker/name resolver.
- `sprites.js`: sprite inventory and state-selection boundary for future labels such as `walking`, `eating`, and `sleeping`.
- `renderer.js`: isolated scene layer designed to evolve into a roster capped at five.
- `index.js`: SillyTavern events, settings, and orchestration.

Planned next stages include persistent scene state, explicit enter/exit tracking, a five-slot layout, active-speaker focus, and generalized visual-state classification.

## Development

Run `npm test` with Node.js 20 or newer.

Built against SillyTavern's `release` branch in August 2026. The extension makes only same-origin sprite-list requests and has no external network dependency.

License: GPL-3.0.
