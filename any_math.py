import math
import string

import torch
from simpleeval import simple_eval

from comfy_api.latest import io, ui

MAX_EXPONENT = 4000


def _variadic_sum(*args):
    """Support both sum(values) and sum(a, b, c)."""
    if len(args) == 1 and hasattr(args[0], "__iter__"):
        return sum(args[0])
    return sum(args)


def _safe_pow(base, exp):
    # The ** operator is guarded by simpleeval, but pow() as a function is not.
    if abs(exp) > MAX_EXPONENT:
        raise ValueError(f"Exponent {exp} exceeds maximum allowed ({MAX_EXPONENT})")
    return pow(base, exp)


def _clamp(value, low, high):
    return max(low, min(high, value))


# Same set as ComfyUI's Math Expression node, plus clamp, exp and the constants pi and tau.
MATH_FUNCTIONS = {
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


def to_operand(value):
    """Numbers and booleans as they are; text that looks like a number becomes one."""
    if isinstance(value, torch.Tensor) and value.numel() == 1:
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


class ElegantAnyMathMultiPreview(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="ElegantAnyMathMultiPreview",
            display_name="Elegant Any Math Multi Preview",
            search_aliases=["math", "expression", "formula", "calculate", "calculator", "eval"],
            category="utilities/elegant",
            description="Evaluates a math expression over the inputs a, b, c, … and outputs the "
            "result as int, float, boolean and string. A new input appears each time you "
            "connect the last one.",
            is_output_node=True,
            inputs=[
                io.Autogrow.Input(
                    "values",
                    template=io.Autogrow.TemplateNames(
                        io.AnyType.Input("value"), names=list(string.ascii_lowercase), min=1
                    ),
                    tooltip="Values used in the expression as a, b, c, …",
                ),
                io.String.Input(
                    "expression",
                    default="a + b",
                    tooltip="For example: a * b, (a + b) / 2, max(a, b), a > b, round(a / 64) * 64. "
                    "Functions: sum min max abs round pow sqrt ceil floor log log2 log10 exp sin "
                    "cos tan clamp int float str bool. Constants: pi, tau.",
                ),
            ],
            outputs=[
                io.Int.Output(display_name="int"),
                io.Float.Output(display_name="float"),
                io.Boolean.Output(display_name="boolean"),
                io.String.Output(display_name="string"),
            ],
        )

    @classmethod
    def execute(cls, values: io.Autogrow.Type, expression: str) -> io.NodeOutput:
        if not expression.strip():
            raise ValueError("Expression cannot be empty.")

        operands = {name: to_operand(value) for name, value in values.items()}
        names = {**CONSTANTS, **operands, "values": list(operands.values())}
        result = simple_eval(expression, names=names, functions=MATH_FUNCTIONS)
        as_int, as_float, as_bool, as_string = to_outputs(result)

        preview = f"{as_string}\n\nint      {as_int}\nfloat    {as_float}\nboolean  {as_bool}"
        return io.NodeOutput(as_int, as_float, as_bool, as_string, ui=ui.PreviewText(preview))
