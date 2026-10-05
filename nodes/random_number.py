from comfy_api.latest import io, ui

from ..core.random_number import random_number


class ElegantRandomNumber(io.ComfyNode):
    """A random number from a seed: ComfyUI's standard seed plus the Elegant seed buttons (web/js/seed.js)."""

    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="ElegantRandomNumber",
            display_name="Elegant Random Number",
            search_aliases=["random", "random number", "random int", "random float", "rng", "dice"],
            category="utilities/elegant",
            description="A random number between min and max, drawn from a seed: the same seed always "
            "gives the same number. Standard ComfyUI seed, plus the Elegant seed buttons.",
            is_output_node=True,
            inputs=[
                # ComfyUI's standard seed, like KSampler's: its "control after generate"
                # randomizes it on queue. web/js/seed.js adds the buttons.
                io.Int.Input(
                    "seed",
                    default=0,
                    min=0,
                    max=0xFFFFFFFFFFFFFFFF,
                    control_after_generate=True,
                    tooltip="The seed the number is drawn from. Same seed, same number.",
                ),
                io.Float.Input("min", default=1, min=-1e12, max=1e12, step=1, tooltip="Smallest possible number."),
                io.Float.Input("max", default=100, min=-1e12, max=1e12, step=1, tooltip="Largest possible number."),
                io.Boolean.Input(
                    "number_type",
                    default=True,
                    label_on="int",
                    label_off="float",
                    tooltip="int: a whole number (min and max included). float: a decimal number.",
                ),
            ],
            outputs=[
                io.Int.Output(display_name="int"),
                io.Float.Output(display_name="float"),
                io.String.Output(display_name="string"),
            ],
        )

    @classmethod
    def execute(cls, seed: int, min: float, max: float, number_type: bool) -> io.NodeOutput:
        value = random_number(seed, min, max, integer=number_type)
        kind = "int" if number_type else "float"
        preview = f"{value}\n\n{kind} between {min:g} and {max:g} · seed {seed}"
        return io.NodeOutput(int(value), float(value), str(value), ui=ui.PreviewText(preview))
