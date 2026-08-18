# Possible Issues and Enhancement Ideas

This catalogue records behavior to investigate or improve later. Items listed here are not necessarily confirmed bugs and are not yet scheduled for implementation.

## 1. Allow shorter location mappings

**Status:** Implemented in v0.6.1

Background mappings currently require the complete normalized Location header to match. This can make mappings overly specific. For example:

```text
Sunset Shores Apartments - Will's Unit, Bedroom = bedroom.webp
```

Investigate allowing a shorter mapping such as:

```text
Bedroom = bedroom.webp
```

The shorter mapping now selects `bedroom.webp` when `Bedroom` appears in the structured Location header. Multiple required terms can distinguish ambiguous rooms, for example `Sunset Shores Apartments + Pool = apartment_pool.webp`. Exact and more-specific mappings take priority.

## 2. Scene roster can be lost when characters are unnamed

**Status:** Open possible bug and persistence enhancement

A character's sprite can disappear when the latest response does not name them, even if the character speaks or performs actions. This occurs most often after manually resetting the scene, switching to another chat, or returning to an existing chat. **Test latest AI message** may then report that no characters are in the scene until a later response explicitly names them again.

Investigate rebuilding or recovering the scene roster from one or two preceding AI responses when the saved roster is empty. A safe implementation must preserve detected exits and location transitions so that historical mentions do not restore characters who have already left the scene.

Possible approaches to evaluate later:

- Persist and restore the last confirmed roster more reliably when switching chats.
- Use a bounded lookback only when the current roster is unexpectedly empty.
- Process the lookback chronologically, including entrance, exit, and location-change events.
- Store explicit scene-state checkpoints rather than re-detecting names from isolated messages.

## 3. Missing action sprite can discard the active outfit

**Status:** Open possible bug

When a character has a persistent non-default outfit and performs an action without a corresponding outfit/action sprite, the renderer can fall back to an unprefixed expression sprite and visually discard the active outfit.

Example: a nude character is showering, but `nude_showering` does not exist. The extension displays an ordinary expression sprite instead of retaining the nude outfit.

Expected fallback behavior while a non-default outfit is active:

1. `outfit_action`
2. `outfit_expression`
3. `outfit_neutral`
4. Only then consider unprefixed sprites or the character-card avatar

Investigate whether the outfit expression label is unavailable, mismatched, or skipped when the requested action sprite is missing. The active outfit state should remain authoritative during sprite fallback.

## 4. Automatic backgrounds can stop updating or reporting status

**Status:** Additional header-format fix implemented in v0.6.3; awaiting verification

Automatic background selection may stop changing the background after previously working. Background information also disappears from the extension's test/status output, including both successful mappings and unmatched-location notices.

**Additional observation:** Background selection works in at least one existing chat, but not in a brand-new chat that has no lorebook attached. The new chat does contain a valid structured Location header, and its locations have been added to the extension's mappings. Nevertheless, the background does not change and the status output reports neither a successful match nor **No background mapping**. This suggests background matching is not being reached, its result is being lost, or message routing returns early in this chat contextâ€”not that the Location header itself is absent.

Investigate whether Location-header processing is reached on new messages and **Test latest AI message** execution after the outfit-tracking update. Test new chats both with and without a lorebook. Verify that background processing runs independently of character candidates, lorebook availability, and a non-empty scene roster, including when no matching NPC card is found. Check for early returns during sprite rendering and for later status updates that may erase the background result. Also verify that background settings survive extension updates.

Useful evidence for later diagnosis includes the complete Location header, configured background mapping, current background filename, and full **Test latest AI message** output.

The v0.6.2 fix uses SillyTavern's `getCurrentChatId()` API instead of allowing chats for the same character to share a fallback scene key. It also forcibly restores a chat's saved background when switching chats and reports mappings that were skipped as already selected.

Further testing found that some presets emit `ðŸ“ Apartment - Kitchen` while others emit `ðŸ“ Location: Apartment - Kitchen`. The original parser required the literal word `Location`, causing the first format to silently return no location. Version 0.6.3 supports both formats.

## 5. Persistent outfit state can revert without a clothing change

**Status:** Open possible regression

A character's detected outfit may apply for one response but revert to default clothing or an unprefixed expression sprite in a later response, even though the narration does not describe the character getting dressed or otherwise changing clothes.

Example: a character is detected as nude in one response. The following response contains no clothing change, but the displayed sprite returns to the default expression/outfit.

Investigate outfit-state storage and restoration across message processing, scene updates, location handling, chat switching, and extension reloads. Distinguish between these possibilities:

- The saved outfit state is being reset to the configured default.
- The outfit remains saved but sprite selection ignores it.
- A scene/location reset creates a new outfit state even though the character remains present.
- The character name is temporarily missing from the roster, causing its outfit state to be discarded and recreated.

Expected behavior: an outfit remains active until a new outfit is reliably detected or the user manually resets/changes it.

