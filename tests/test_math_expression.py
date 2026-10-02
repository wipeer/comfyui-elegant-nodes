import pytest

from core.math_expression import evaluate, format_value, substitute, to_operand, to_outputs


def test_worked_expression_keeps_layout():
    result = evaluate("a  + (b / 2) - c", {"a": 1, "b": 2, "c": 3})
    assert result.preview.splitlines()[0] == "1  + (2 / 2) - 3 = -1"
    assert (result.as_int, result.as_float, result.as_bool, result.as_string) == (-1, -1.0, True, "-1.0")


def test_outputs():
    result = evaluate("a / b", {"a": 1360, "b": 768})
    assert result.as_int == 1
    assert result.as_float == pytest.approx(1.7708333)
    assert result.as_bool is True


def test_comparison_and_logic():
    assert evaluate("a > b and b >= 768", {"a": 1360, "b": 768}).as_bool is True
    assert evaluate("a if a > b else b", {"a": 3, "b": 7}).as_int == 7


def test_functions_and_values_list():
    assert evaluate("round(a / 64) * 64", {"a": 1000}).as_int == 1024
    assert evaluate("clamp(a, 0, 3)", {"a": 5}).as_int == 3
    assert evaluate("sum(values)", {"a": 1, "b": 2, "c": 3}).as_int == 6
    assert evaluate("max(a, b) // 16", {"a": 1360, "b": 768}).preview.startswith("max(1360, 768) // 16 = 85")


def test_text_inputs():
    assert evaluate("a * b", {"a": "12", "b": "0.5"}).as_float == 6.0
    result = evaluate("a + '_' + str(b)", {"a": "img", "b": 42})
    assert (result.as_int, result.as_float, result.as_string) == (0, 0.0, "img_42")


@pytest.mark.parametrize(
    "expression, values, error",
    [
        ("", {"a": 1}, "cannot be empty"),
        ("a / 0", {"a": 1}, "division by zero"),
        ("a + b", {"a": 1}, "'b' is not defined"),
        ("__import__('os')", {"a": 1}, "not defined"),
        ("a ** 99999", {"a": 10}, "too large"),
        ("pow(a, 99999)", {"a": 10}, "exceeds maximum"),
    ],
)
def test_errors(expression, values, error):
    with pytest.raises(Exception, match=error):
        evaluate(expression, values)


def test_helpers():
    assert to_operand(" 7 ") == 7
    assert to_operand("x") == "x"
    assert to_outputs(True) == (1, 1.0, True, "True")
    assert format_value(2.0) == "2"
    assert format_value(0.1) == "0.1"
    assert format_value("a") == "'a'"
    assert substitute("max(a, b)", {"a": 1, "b": 2, "max": 9}) == "max(1, 2)"
