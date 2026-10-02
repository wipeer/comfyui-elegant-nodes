import string

from comfy_api.latest import io, ui

from ..core.math_expression import evaluate


class ElegantAnyMathMultiPreview(io.ComfyNode):
    """A math expression over any number of inputs, with a worked-out preview."""

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
                    "Click the ? in the title for all operators and functions.",
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
        result = evaluate(expression, values)
        return io.NodeOutput(
            result.as_int, result.as_float, result.as_bool, result.as_string, ui=ui.PreviewText(result.preview)
        )
