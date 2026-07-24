#!/usr/bin/env python3
"""Visualise the structure of an Aardvark result JSON as a schema tree.

Prints each key with its type, and for containers the length. Long lists of
uniform items (e.g. `bonds`, `obs`) are collapsed: the first element is shown
as a representative shape rather than every entry. Scalars show a truncated
sample value.

Usage:
    python scripts/inspect-json.py [path/to/result.json] [--depth N]

Defaults to the sample bundled in public/sample/A1C3B.json.
"""

import argparse
import json
import os
from typing import Any

SAMPLE = os.path.join(
    os.path.dirname(__file__), "..", "public", "sample", "A1C3B.json"
)

# Tree-drawing glyphs.
TEE, ELBOW, PIPE, SPACE = "├─ ", "└─ ", "│  ", "   "


def summarise_scalar(value: Any) -> str:
    """A short, single-line preview of a leaf value."""
    text = repr(value)
    text = text.replace("\n", "\\n")
    if len(text) > 60:
        text = text[:57] + "..."
    return f"{type(value).__name__} = {text}"


def walk(node: Any, depth: int, max_depth: int, prefix: str = "") -> None:
    """Recursively print a node's children as a tree."""
    if isinstance(node, dict):
        items = list(node.items())
        for i, (key, value) in enumerate(items):
            last = i == len(items) - 1
            branch = ELBOW if last else TEE
            print(prefix + branch + render(key, value))
            if isinstance(value, (dict, list)) and depth < max_depth:
                child_prefix = prefix + (SPACE if last else PIPE)
                descend(value, depth, max_depth, child_prefix)
    elif isinstance(node, list) and node:
        # Represent a list by its first element (assumed uniform).
        descend(node, depth, max_depth, prefix)


def descend(value: Any, depth: int, max_depth: int, prefix: str) -> None:
    """Recurse into a container, collapsing uniform lists to one sample."""
    if isinstance(value, list):
        if value:
            print(prefix + ELBOW + f"[0] {shape(value[0])}")
            if isinstance(value[0], (dict, list)):
                walk(value[0], depth + 1, max_depth, prefix + SPACE)
    else:
        walk(value, depth + 1, max_depth, prefix)


def shape(value: Any) -> str:
    """One-word description of a value's shape."""
    if isinstance(value, dict):
        return f"dict[{len(value)}]"
    if isinstance(value, list):
        return f"list[{len(value)}]"
    return summarise_scalar(value)


def render(key: str, value: Any) -> str:
    """Label a key with the shape of its value."""
    return f"{key}: {shape(value)}"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path", nargs="?", default=SAMPLE, help="JSON file")
    parser.add_argument(
        "--depth", type=int, default=4, help="max nesting depth (default 4)"
    )
    args = parser.parse_args()

    with open(args.path, encoding="utf-8") as fh:
        data = json.load(fh)

    print(f"{os.path.abspath(args.path)}")
    print(shape(data))
    walk(data, 0, args.depth)


if __name__ == "__main__":
    main()
