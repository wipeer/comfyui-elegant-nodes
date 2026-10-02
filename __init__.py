from typing_extensions import override

from comfy_api.latest import ComfyExtension, io

from .any_to_string import ElegantAnyToString, ElegantAnyToStringAdvanced
from .resolution import ElegantResolution
from .seed import ElegantSeed

WEB_DIRECTORY = "./web/js"


class ElegantExtension(ComfyExtension):
    @override
    async def get_node_list(self) -> list[type[io.ComfyNode]]:
        return [ElegantSeed, ElegantResolution, ElegantAnyToString, ElegantAnyToStringAdvanced]


async def comfy_entrypoint() -> ElegantExtension:
    return ElegantExtension()


__all__ = ["comfy_entrypoint", "WEB_DIRECTORY"]
