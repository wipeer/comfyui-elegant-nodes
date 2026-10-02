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
            description="Outputs a seed value as both an integer and a string.",
            inputs=[
                io.Int.Input(
                    "seed",
                    default=0,
                    min=0,
                    max=sys.maxsize,
                    control_after_generate=io.ControlAfterGenerate.fixed,
                    tooltip="The seed value. Use the control widget to fix, increment, decrement or randomize it after each run.",
                ),
            ],
            outputs=[
                io.Int.Output(display_name="seed"),
                io.String.Output(display_name="seed_text"),
            ],
        )

    @classmethod
    def execute(cls, seed: int) -> io.NodeOutput:
        return io.NodeOutput(seed, str(seed))


class ElegantSeedExtension(ComfyExtension):
    @override
    async def get_node_list(self) -> list[type[io.ComfyNode]]:
        return [ElegantSeed]


async def comfy_entrypoint() -> ElegantSeedExtension:
    return ElegantSeedExtension()
