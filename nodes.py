import sys
from typing_extensions import override

from comfy_api.latest import ComfyExtension, io


class ElegantSeed(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="ElegantSeed",
            display_name="Elegant Seed",
            search_aliases=["seed", "random", "elegant seed"],
            category="utilities/elegant",
            description="Outputs a seed value as both an integer and a string. "
            "In random mode a new seed is generated before or after each run, following the "
            "'Widget control mode' setting.",
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
                    tooltip="The seed value. Type a number to set it manually.",
                ),
            ],
            outputs=[
                io.Int.Output(display_name="seed"),
                io.String.Output(display_name="seed_text"),
            ],
        )

    @classmethod
    def execute(cls, mode: bool, seed: int) -> io.NodeOutput:
        # Randomization happens in the frontend (web/js/elegant_seed.js), so the
        # prompt always carries the concrete seed that was used.
        return io.NodeOutput(seed, str(seed))


class ElegantSeedExtension(ComfyExtension):
    @override
    async def get_node_list(self) -> list[type[io.ComfyNode]]:
        return [ElegantSeed]


async def comfy_entrypoint() -> ElegantSeedExtension:
    return ElegantSeedExtension()
