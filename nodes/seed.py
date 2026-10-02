import sys

from comfy_api.latest import io


class ElegantSeed(io.ComfyNode):
    """A seed with a random/fixed switch.

    Randomizing, the buttons and remembering the last seed all happen in the
    frontend (web/js/seed.js), so the prompt always carries the seed that was used.
    """

    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="ElegantSeed",
            display_name="Elegant Seed",
            search_aliases=["seed", "random", "elegant seed"],
            category="utilities/elegant",
            description="A seed you can keep fixed or have regenerated on every run, before or "
            "after queueing per the 'Widget control mode' setting.",
            inputs=[
                io.Boolean.Input(
                    "mode",
                    default=True,
                    label_on="random",
                    label_off="fixed",
                    tooltip="random: a new seed for every run (before or after queueing, per the "
                    "'Widget control mode' setting). fixed: always use the seed below.",
                ),
                io.Int.Input(
                    "seed",
                    default=0,
                    min=0,
                    max=sys.maxsize,
                    # Opt out of the frontend's automatic "control after generate" widget for
                    # inputs named "seed"; the mode switch and buttons replace it.
                    control_after_generate=False,
                    tooltip="The seed. Type a number to use it for the next run.",
                ),
            ],
            outputs=[
                io.Int.Output(display_name="seed"),
                io.String.Output(display_name="seed_text"),
            ],
        )

    @classmethod
    def execute(cls, mode: bool, seed: int) -> io.NodeOutput:
        return io.NodeOutput(seed, str(seed))
