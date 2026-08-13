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

