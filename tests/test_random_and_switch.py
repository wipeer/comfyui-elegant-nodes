import pytest

from core.math_expression import evaluate
from core.random_number import random_number
from core.switch import pick_index


def test_random_number_is_reproducible_and_in_range():
    values = [random_number(seed, 1, 6, integer=True) for seed in range(200)]
    assert all(1 <= v <= 6 and isinstance(v, int) for v in values)
    assert set(values) == {1, 2, 3, 4, 5, 6}
    assert random_number(42, 1, 6, True) == random_number(42, 1, 6, True)


def test_random_float_and_swapped_range():
    value = random_number(7, 10, 0, integer=False)
    assert 0 <= value <= 10 and isinstance(value, float)


def test_random_int_without_whole_number_in_range():
    with pytest.raises(ValueError, match="no whole number"):
        random_number(1, 0.2, 0.8, integer=True)


@pytest.mark.parametrize(
    "index, mode, expected",
    [
        (1, "error", 0), (3, "error", 2),
        (0, "clamp", 0), (-5, "clamp", 0), (4, "clamp", 2), (99, "clamp", 2),
        (4, "wrap", 0), (0, "wrap", 2), (-1, "wrap", 1), (7, "wrap", 0),
    ],
)
def test_pick_index(index, mode, expected):
    assert pick_index(index, 3, mode) == expected


@pytest.mark.parametrize("index", [0, 4, -1])
def test_pick_index_error_by_default(index):
    with pytest.raises(ValueError, match="out of range"):
        pick_index(index, 3)


def test_pick_index_needs_sources():
    with pytest.raises(ValueError, match="connect at least one"):
        pick_index(1, 0, "wrap")


def test_seeded_math_functions():
    roll = evaluate("randint(a, 1, 6)", {"a": 123}).as_int
    assert 1 <= roll <= 6 and roll == evaluate("randint(a, 1, 6)", {"a": 123}).as_int
    assert 0 <= evaluate("rand(a)", {"a": 5}).as_float < 1
    assert 2 <= evaluate("uniform(a, 2, 3)", {"a": 5}).as_float <= 3
