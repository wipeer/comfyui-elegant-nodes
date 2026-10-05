import sys

from comfy_api.latest import io, ui

from ..core.random_number import random_number


class ElegantRandomNumber(io.ComfyNode):
    """A random number from a seed, with the same seed controls as Elegant Seed (web/js/seed.js)."""

    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="ElegantRandomNumber",
            display_name="Elegant Random Number",
            search_aliases=["random", "random number", "random int", "random float", "rng", "dice"],
            category="utilities/elegant",
            description="A random number between min and max, drawn from a seed: the same seed always "
            "gives the same number. Random/fixed switch and seed buttons like Elegant Seed.",
            is_output_node=True,
            inputs=[
                io.Boolean.Input(
                    "mode",
                    default=True,
                    label_on="random",
                    label_off="fixed",
                    tooltip="random: a new seed (and number) for every run, before or after queueing per "
                    "the 'Widget control mode' setting. fixed: always use the seed below.",
                ),
                io.Int.Input(
                    "seed",
                    default=0,
                    min=0,
                    max=sys.maxsize,
                    # The mode switch and buttons replace the automatic seed control widget.
                    control_after_generate=False,
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
    def execute(cls, mode: bool, seed: int, min: float, max: float, number_type: bool) -> io.NodeOutput:
        value = random_number(seed, min, max, integer=number_type)
        kind = "int" if number_type else "float"
        preview = f"{value}\n\n{kind} between {min:g} and {max:g} · seed {seed}"
        return io.NodeOutput(int(value), float(value), str(value), ui=ui.PreviewText(preview))
