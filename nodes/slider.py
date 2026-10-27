import math

from comfy_api.latest import io

from ..core.slider import snap_to_range


class ElegantSlider(io.ComfyNode):
    """A slider whose range you set on the node. The range follows min / max / step in web/js/slider.js."""

    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="ElegantSlider",
            display_name="Elegant Slider",
            search_aliases=["slider", "number slider", "int slider", "float slider", "range", "knob", "value"],
            category="elegant",
            description="A slider for a number: set the smallest and largest value (and the step) on the "
            "node, then drag. Outputs the value as an int and as a float.",
            inputs=[
                # The range here is only the widest ComfyUI allows; web/js/slider.js narrows the slider
                # to min / max / step, and execute() keeps the value there for runs from the API.
                io.Float.Input(
                    "value",
                    default=50,
                    min=-1e12,
                    max=1e12,
                    step=1,
                    display_mode=io.NumberDisplay.slider,
                    tooltip="Drag to choose. The range comes from min and max below.",
                ),
                io.Float.Input("min", default=0, min=-1e12, max=1e12, step=1, tooltip="Smallest value on the slider."),
                io.Float.Input("max", default=100, min=-1e12, max=1e12, step=1, tooltip="Largest value on the slider."),
                io.Float.Input(
                    "step",
                    default=1,
                    min=0,
                    max=1e12,
                    step=0.01,
                    tooltip="Size of one step: 1 for whole numbers, 0.01 for hundredths. 0: any value.",
                ),
            ],
            outputs=[
                io.Int.Output(display_name="int"),
                io.Float.Output(display_name="float"),
            ],
        )

    @classmethod
    def execute(cls, value: float, min: float, max: float, step: float) -> io.NodeOutput:
        snapped = snap_to_range(value, min, max, step)
        # floor(x + 0.5) rather than round(): Python rounds halves to even, JavaScript does not.
        return io.NodeOutput(int(math.floor(snapped + 0.5)), float(snapped))
