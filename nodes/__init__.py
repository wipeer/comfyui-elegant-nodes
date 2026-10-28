"""ComfyUI node definitions (V3 schema). The logic they use lives in ../core."""

from .load_image_folder import ElegantLoadImageFromFolder
from .math_expression import ElegantAnyMathMultiPreview
from .notes import ElegantNotes, ElegantNotesFile, ElegantNotesMerge
from .random_number import ElegantRandomNumber
from .reroute import ElegantReroute
from .resolution_reroute import ElegantResolutionReroute
from .resolution_selector import ElegantResolutionSelector
from .seed import ElegantSeed
from .slider import ElegantSlider
from .text_preview import ElegantAnyToStringMultiPreview, ElegantAnyToStringPreview

NODES = [
    ElegantSeed,
    ElegantResolutionSelector,
    ElegantAnyToStringPreview,
    ElegantAnyToStringMultiPreview,
    ElegantAnyMathMultiPreview,
    ElegantRandomNumber,
    ElegantLoadImageFromFolder,
    ElegantReroute,
    ElegantResolutionReroute,
    ElegantSlider,
    ElegantNotes,
    ElegantNotesMerge,
    ElegantNotesFile,
]
