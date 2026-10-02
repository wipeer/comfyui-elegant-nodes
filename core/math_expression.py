"""Safe evaluation of math expressions over named values, with a worked-out preview."""

import io
import math
import tokenize
from dataclasses import dataclass

from simpleeval import simple_eval

MAX_EXPONENT = 4000


def _variadic_sum(*args):
    """Support both sum(values) and sum(a, b, c)."""
    if len(args) == 1 and hasattr(args[0], "__iter__"):
        return sum(args[0])
    return sum(args)


def _safe_pow(base, exponent):
    # simpleeval guards the ** operator, but not pow() called as a function.
    if abs(exponent) > MAX_EXPONENT:
        raise ValueError(f"Exponent {exponent} exceeds maximum allowed ({MAX_EXPONENT})")
    return pow(base, exponent)


def _clamp(value, low, high):
    return max(low, min(high, value))


# Same set as ComfyUI's Math Expression node, plus clamp, exp, str and bool.
FUNCTIONS = {
    "sum": _variadic_sum,
    "min": min,
    "max": max,
    "abs": abs,
    "round": round,
    "pow": _safe_pow,
    "sqrt": math.sqrt,
    "ceil": math.ceil,
    "floor": math.floor,
    "log": math.log,
    "log2": math.log2,
    "log10": math.log10,
    "exp": math.exp,
    "sin": math.sin,
    "cos": math.cos,
    "tan": math.tan,
    "clamp": _clamp,
    "int": int,
    "float": float,
    "str": str,
    "bool": bool,
}
CONSTANTS = {"pi": math.pi, "tau": math.tau}


@dataclass(frozen=True)
class MathResult:
    as_int: int
    as_float: float
    as_bool: bool
    as_string: str
    preview: str


def to_operand(value):
    """Numbers and booleans as they are; text that looks like a number becomes one."""
    # Single-element tensors (e.g. from other math nodes) become plain numbers.
    if hasattr(value, "numel") and hasattr(value, "item") and value.numel() == 1:
        return value.item()
    if isinstance(value, str):
        text = value.strip()
        for parse in (int, float):
            try:
                return parse(text)
            except ValueError:
                pass
    return value


def to_outputs(result) -> tuple[int, float, bool, str]:
    """The result as int, float, boolean and string."""
    if isinstance(result, (bool, int, float)):
        try:
            number = float(result)
        except OverflowError:
            raise ValueError("The expression produced a result too large for a float.") from None
        if not math.isfinite(number):
            raise ValueError(f"The expression produced a non-finite result: {result}")
        return int(result), number, bool(result), str(result)
    # Text or anything else: numbers only when it reads as one.
    operand = to_operand(result)
    if isinstance(operand, (int, float)) and not isinstance(operand, bool):
        return int(operand), float(operand), bool(result), str(result)
    return 0, 0.0, bool(result), str(result)


def format_value(value) -> str:
    """How a value is written in the worked-out expression."""
    if isinstance(value, bool):
        return str(value)
    if isinstance(value, float):
        return str(int(value)) if value.is_integer() and abs(value) < 1e16 else repr(value)
    if isinstance(value, int):
        return str(value)
    if isinstance(value, str):
        return repr(value)
    if isinstance(value, list):
        return "[" + ", ".join(format_value(item) for item in value) + "]"
    text = str(value).replace("\n", " ")
    return text if len(text) <= 40 else text[:37] + "..."


def substitute(expression: str, names: dict) -> str:
    """The expression with each name replaced by its value, keeping the layout."""
    try:
        tokens = list(tokenize.generate_tokens(io.StringIO(expression).readline))
    except (tokenize.TokenError, IndentationError, SyntaxError):
        return expression

    line_starts = [0]
    for line in expression.splitlines(keepends=True):
        line_starts.append(line_starts[-1] + len(line))

    replacements = []
    for index, token in enumerate(tokens):
        if token.type != tokenize.NAME or token.string not in names:
            continue
        previous = tokens[index - 1].string if index > 0 else ""
        following = tokens[index + 1].string if index + 1 < len(tokens) else ""
        if previous == "." or following == "(":  # attribute or function call, not a value
            continue
        start = line_starts[token.start[0] - 1] + token.start[1]
        end = line_starts[token.end[0] - 1] + token.end[1]
        replacements.append((start, end, format_value(names[token.string])))

    for start, end, text in reversed(replacements):
        expression = expression[:start] + text + expression[end:]
    return expression


def evaluate(expression: str, values: dict) -> MathResult:
    """Evaluates `expression` with `values` as variables (a, b, …) and `values` as their list."""
    if not expression.strip():
        raise ValueError("Expression cannot be empty.")

    operands = {name: to_operand(value) for name, value in values.items()}
    variables = {**operands, "values": list(operands.values())}
    result = simple_eval(expression, names={**CONSTANTS, **variables}, functions=FUNCTIONS)
    as_int, as_float, as_bool, as_string = to_outputs(result)

    worked = substitute(expression.strip(), variables)
    preview = (
        f"{worked} = {format_value(result)}\n\n"
        f"int      {as_int}\n"
        f"float    {as_float}\n"
        f"boolean  {as_bool}\n"
        f"string   {as_string}"
    )
    return MathResult(as_int, as_float, as_bool, as_string, preview)
