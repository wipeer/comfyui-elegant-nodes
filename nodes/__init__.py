"""ComfyUI node definitions (V3 schema). The logic they use lives in ../core."""

from .math_expression import ElegantAnyMathMultiPreview
from .random_number import ElegantRandomNumber
from .resolution_selector import ElegantResolutionSelector
from .seed import ElegantSeed
from .text_preview import ElegantAnyToStringMultiPreview, ElegantAnyToStringPreview

NODES = [
    ElegantSeed,
    ElegantResolutionSelector,
    ElegantAnyToStringPreview,
    ElegantAnyToStringMultiPreview,
    ElegantAnyMathMultiPreview,
    ElegantRandomNumber,
]
