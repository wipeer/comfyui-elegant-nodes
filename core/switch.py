"""Choosing one of several inputs by a 1-based index."""

OUT_OF_RANGE_OPTIONS = ["error", "clamp", "wrap"]


def pick_index(index: int, count: int, out_of_range: str = "error") -> int:
    """The 0-based position for a 1-based `index` among `count` items.

    out_of_range: "error" raises; "clamp" uses the first item below 1 and the
    last item above `count`; "wrap" counts around (count + 1 is the first again).
    """
    if count < 1:
        raise ValueError("Nothing to switch between: connect at least one source.")
    if 1 <= index <= count:
        return index - 1
    if out_of_range == "clamp":
        return 0 if index < 1 else count - 1
    if out_of_range == "wrap":
        return (index - 1) % count
    raise ValueError(f"Index {index} is out of range: there are {count} sources (1–{count}).")
