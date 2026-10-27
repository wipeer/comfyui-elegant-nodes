"""A number kept within a range and on a step: what the Elegant Slider outputs."""

import math


def snap_to_range(value: float, minimum: float, maximum: float, step: float) -> float:
    """`value` limited to the range, then moved to the nearest step counted from the lower end.

    The range may be given either way round. A step of 0 (or less) only limits. The last step may
    stop short of the upper end (0 to 10 in steps of 3 gives 0, 3, 6, 9): the result never leaves
    the range.
    """
    low, high = (minimum, maximum) if minimum <= maximum else (maximum, minimum)
    value = min(max(value, low), high)
    if step > 0:
        # floor(x + 0.5) rather than round(): Python rounds halves to even, JavaScript does not.
        steps = math.floor((value - low) / step + 0.5)
        value = low + steps * step
        if value > high:
            value = low + math.floor((high - low) / step) * step
    # Gets rid of 0.30000000000000004-style noise from the multiplication above.
    return round(value, 10)
