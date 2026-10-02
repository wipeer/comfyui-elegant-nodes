"""Elegant Nodes for ComfyUI: small, tidy utility nodes that also work inside subgraphs."""

from typing_extensions import override

from comfy_api.latest import ComfyExtension, io

from .nodes import NODES

WEB_DIRECTORY = "./web/js"


class ElegantNodesExtension(ComfyExtension):
    @override
    async def get_node_list(self) -> list[type[io.ComfyNode]]:
        return NODES


async def comfy_entrypoint() -> ElegantNodesExtension:
    return ElegantNodesExtension()


__all__ = ["WEB_DIRECTORY", "comfy_entrypoint"]
