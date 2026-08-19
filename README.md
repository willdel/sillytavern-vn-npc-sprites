# VN NPC Sprites for SillyTavern

A third-party UI extension that displays lorebook-driven NPCs in Visual Novel mode using matching character-card sprite folders, without loading those cards into the chat.

## Features

- Persistent, per-chat scene roster with up to five characters.
- Deterministic entrance, exit, location, and explicit-speaker tracking.
- Active-speaker focus and multi-character layout.
- Expression/action sprites with character-card avatar fallback.
- Editable aliases and action definitions.
- Automatic background selection from structured Location headers.
- Persistent, configurable per-character outfit tracking and manual correction.
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

## Suggestions

I use the [Freaky Frankenstein 5.2 Bolt preset](https://www.reddit.com/r/SillyTavernAI/comments/1vmc07f/preset_update_freaky_frankenstein_52_the_first/). Its structured response header includes location information that works well with the extension's Location-header scene and background tracking. The preset is recommended, but it is not required to use the extension.

## Scene tracking

The extension keeps a separate persistent roster for each chat. Explicit speakers, named narrative dialogue paragraphs, and physical-presence cues add characters; subject-bound exit cues remove them. A location change clears the old roster before adding characters at the new location. Ordinary conversational references do not add sprites.

Scene, outfit, and background state are keyed to SillyTavern's current chat ID. Switching chats restores the background saved for that chat.

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
Pool = generic-pool.webp
Sunset Shores Apartments + Pool = apartment_pool.webp
School + Pool = school_pool.webp
```

When an AI message contains a structured `ðŸ“ Location: Name` or `ðŸ“ Name` header, the extension selects the mapped file through SillyTavern's built-in `/bg` command. A simple mapping such as `Bedroom` matches changing headers that contain that term. Use `+` to require several terms when a generic room name is ambiguous. Exact and more-specific mappings take priority over generic mappings. Matching ignores capitalization, repeated spaces, and typographic dash variants, and only examines the structured headerâ€”not ordinary narration. If no mapping exists, the current background remains unchanged and the test status reports the unmatched location.

## Outfit sprites

Outfits are persistent per character and use editable definitions:

```text
casual | 10 = casual clothes, everyday clothes, jeans, shorts
uniform | 40 = uniform, work clothes, apron, scrubs
swimwear | 60 = swimwear, swimsuit, bikini
sleepwear | 70 = pajamas, nightgown, underwear, lingerie
nude | 100 = nude, naked, unclothed, no clothes
```

Higher priorities win when a response contains multiple outfit triggers; equal priorities use the latest trigger. In multi-character scenes, a trigger must occur in narration associated with the named character. Outfit state remains unchanged when no trigger is detected. Use **Set outfit** or **Reset outfit** to correct ambiguous narration manually.

The configured default outfit (initially `casual`) uses existing unprefixed sprites. Other outfits use `outfit_state` labels:

```text
neutral.webp
joy.webp
walking.webp
swimwear_neutral.webp
swimwear_joy.webp
swimwear_walking.webp
```

Selection order is outfit action, outfit expression, outfit neutral, unprefixed action, unprefixed expression, unprefixed neutral, then the character-card avatar. Custom outfit categories can be added to the definitions without updating the extension.

## VN event images

Special actions and story illustrations can open in a separate draggable popup without replacing the normal expression/outfit sprites. Add event images to the character's existing Character Expressions sprite folder with an `event_` prefix:

```text
event_special_dance.webp
event_first_kiss.webp
event_movie_night.webp
```

Transparent PNG and WebP images remain transparent. The popup defaults to 650 Ã— 650 pixels near the upper-right, preserves image aspect ratio, and can be dragged by its small header. Close it with the header's **Ã—** icon or the keyboard's **Esc** key. The reset icon or a double-click on the handle returns it to the default position. Position and configured size are remembered.

An AI response or lorebook instruction can trigger an event with:

```text
<vn-event character="Elle" image="special_dance">
```

The extension hides this directive from the rendered chat while retaining it in the stored message. It accepts the image name with or without the `event_` prefix. If several valid directives occur in one response, the last directive is shown. A directive is shown once per message/swipe unless manually replayed.

Manual alternatives:

```text
/vn-event character="Elle" image="special_dance"
```

The slash command does not enter the roleplay history or get sent to the model. The extension settings also provide a scene-character dropdown, a searchable all-card field, an event-image dropdown, **Show event**, **Close event**, and **Replay latest directive** controls. Automatic directives can resolve any character card or configured alias even when that character is not in the scene dropdown.

Suggested lorebook instruction:

```text
When this event actually occurs, append this control tag on its own line at the end of the response:
<vn-event character="Elle" image="special_dance">
Do not emit the tag when the event is merely discussed, anticipated, remembered, or declined.
```

## Architecture

- `detection.js`: character names and aliases.
- `scene-tracker.js`: entrances, exits, locations, and roster transitions.
- `action-tracker.js`: configurable action parsing and state transitions.
- `background-tracker.js`: exact Location-header background mappings.
- `outfit-tracker.js`: configurable persistent clothing detection.
- `sprites.js`: sprite inventory and fallback selection.
- `renderer.js`: five-character scene layout and active-speaker focus.
- `index.js`: SillyTavern events, settings, persistence, and orchestration.

## Development

Run `npm test` with Node.js 20 or newer.

Built against SillyTavern's `release` branch in August 2026. License: GPL-3.0.

Possible issues and future enhancement ideas are collected in [POSSIBLE-ISSUES.md](POSSIBLE-ISSUES.md).

