from comfy_api.latest import io


class ElegantSwitch(io.ComfyNode):
    """A true/false switch that picks between two inputs; an empty input falls back to the switch's own boolean."""

    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="ElegantSwitch",
            display_name="Elegant Switch",
            search_aliases=["switch", "toggle", "boolean", "bool", "true", "false", "if", "select", "on off"],
            category="elegant",
            description="A true/false switch. On true it outputs the on_true input, on false the on_false "
            "input. An input with nothing connected outputs the plain true or false instead.",
            inputs=[
                io.Boolean.Input(
                    "switch",
                    default=True,
                    label_on="true",
                    label_off="false",
                    tooltip="true: output on_true. false: output on_false.",
                ),
                # lazy: ComfyUI asks check_lazy_status below which of the two to run first.
                io.AnyType.Input(
                    "on_true", optional=True, lazy=True, tooltip="Output when the switch is true. Empty: outputs true."
                ),
                io.AnyType.Input(
                    "on_false", optional=True, lazy=True, tooltip="Output when the switch is false. Empty: outputs false."
                ),
                io.Boolean.Input(
                    "lazy_evaluation",
                    default=False,
                    optional=True,
                    label_on="on",
                    label_off="off",
                    advanced=True,
                    tooltip="on: only the chosen input is computed, the other branch is skipped. "
                    "off: both inputs are computed, as in any other node.",
                ),
            ],
            outputs=[io.AnyType.Output(display_name="output")],
        )

    @classmethod
    def check_lazy_status(cls, **kwargs) -> list[str]:
        # ComfyUI raises an error when asked for an input that is not connected, and it leaves unconnected
        # optional inputs out of kwargs. So ask only for inputs that are in kwargs as None: connected, not run yet.
        wanted = ["on_true", "on_false"]  # lazy_evaluation off: both, as a node without lazy inputs does
        if kwargs.get("lazy_evaluation", False):
            wanted = ["on_true" if kwargs.get("switch", True) else "on_false"]
        return [name for name in wanted if name in kwargs and kwargs[name] is None]

    @classmethod
    def execute(cls, switch: bool, on_true=None, on_false=None, lazy_evaluation: bool = False) -> io.NodeOutput:
        chosen = on_true if switch else on_false
        # Nothing connected on the chosen side: send the switch itself.
        return io.NodeOutput(bool(switch) if chosen is None else chosen)
