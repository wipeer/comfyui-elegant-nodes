"""Seeded random numbers: the same seed always gives the same number."""

import math
import random


def random_number(seed: int, minimum: float, maximum: float, integer: bool) -> int | float:
    """A number between minimum and maximum (both included), drawn from `seed`."""
    low, high = sorted((minimum, maximum))
    generator = random.Random(seed)
    if integer:
        low_int, high_int = math.ceil(low), math.floor(high)
        if low_int > high_int:
            raise ValueError(f"There is no whole number between {minimum} and {maximum}.")
        return generator.randint(low_int, high_int)
    return generator.uniform(low, high)
