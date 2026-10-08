# Auto JSON Cleaner for SillyTavern

Automatically and permanently removes fenced ` ```json ... ``` ` blocks from
older AI messages.

## Default behavior

**Keep newest messages = 4**

That means:
- Depth 0: untouched
- Depth 1: untouched
- Depth 2: untouched
- Depth 3: untouched
- Depth 4+: JSON blocks are removed

Only AI/character messages are modified.

## Installation

Install this folder as a third-party SillyTavern extension, then enable
**Auto JSON Cleaner**.

The extension listens for `MESSAGE_RECEIVED`, waits briefly for SillyTavern's
normal save/render cycle, then cleans and saves older messages.

It also cleans when a chat is switched/loaded.

## Important

This permanently modifies the saved chat. Make a backup if you want to keep
the original JSON blocks.

The extension only removes fenced blocks beginning with ` ```json ` and ending
at the next ` ``` `.
