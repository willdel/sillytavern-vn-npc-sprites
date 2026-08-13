# Possible Issues and Enhancement Ideas

This catalogue records behavior to investigate or improve later. Items listed here are not necessarily confirmed bugs and are not yet scheduled for implementation.

## 1. Allow shorter location mappings

**Status:** Open enhancement idea

Background mappings currently require the complete normalized Location header to match. This can make mappings overly specific. For example:

```text
Sunset Shores Apartments - Will's Unit, Bedroom = bedroom.webp
```

Investigate allowing a shorter mapping such as:

```text
Bedroom = bedroom.webp
```

The shorter mapping would select `bedroom.webp` when `Bedroom` is a distinct portion of the structured Location header. Any future implementation should avoid accidental matches, support precedence for more-specific mappings, and handle locations containing the same room name in different buildings.

## 2. Scene roster can be lost when characters are unnamed

**Status:** Open possible bug and persistence enhancement

A character's sprite can disappear when the latest response does not name them, even if the character speaks or performs actions. This occurs most often after manually resetting the scene, switching to another chat, or returning to an existing chat. **Test latest AI message** may then report that no characters are in the scene until a later response explicitly names them again.

Investigate rebuilding or recovering the scene roster from one or two preceding AI responses when the saved roster is empty. A safe implementation must preserve detected exits and location transitions so that historical mentions do not restore characters who have already left the scene.

Possible approaches to evaluate later:

- Persist and restore the last confirmed roster more reliably when switching chats.
- Use a bounded lookback only when the current roster is unexpectedly empty.
- Process the lookback chronologically, including entrance, exit, and location-change events.
- Store explicit scene-state checkpoints rather than re-detecting names from isolated messages.

