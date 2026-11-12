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


class ElegantSwitchSplit(io.ComfyNode):
    """The opposite of Elegant Switch: the switch picks which of two outputs is active; the other is blocked."""

    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="ElegantSwitchSplit",
            display_name="Elegant Switch Split",
            search_aliases=["switch", "split", "route", "router", "demux", "branch", "if", "select output", "toggle"],
            category="elegant",
            description="The switch picks which of two outputs is active. The other output is blocked, so "
            "nodes connected only to it do not run. With one input, it goes to the active output. With "
            "two, input_1 feeds output_1 and input_2 feeds output_2.",
            inputs=[
                io.Boolean.Input(
                    "switch",
                    default=True,
                    label_on="output_1",
                    label_off="output_2",
                    tooltip="Which output is active: output_1 (on) or output_2 (off).",
                ),
                io.AnyType.Input("input_1", optional=True, tooltip="Feeds output_1. Alone, it feeds the active output."),
                io.AnyType.Input("input_2", optional=True, tooltip="Feeds output_2 (optional)."),
            ],
            outputs=[
                io.AnyType.Output(display_name="output_1"),
                io.AnyType.Output(display_name="output_2"),
            ],
        )

    @classmethod
    def execute(cls, switch: bool, input_1=None, input_2=None) -> io.NodeOutput:
        from comfy_execution.graph import ExecutionBlocker

        blocked = ExecutionBlocker(None)  # nodes fed only by a blocked output are silently skipped
        if input_2 is None:
            value_1 = value_2 = input_1  # one input: it goes to whichever output is active
        else:
            value_1, value_2 = input_1, input_2
        return io.NodeOutput(value_1 if switch else blocked, blocked if switch else value_2)
