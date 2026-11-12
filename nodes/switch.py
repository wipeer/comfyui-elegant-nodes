from comfy_api.latest import io


class ElegantSwitch(io.ComfyNode):
    """A switch that either picks one of two inputs (pick input) or picks which of two outputs is active (pick output).

    The ids on_true / on_false are kept so saved workflows still load; they are shown as input_1 / input_2."""

    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="ElegantSwitch",
            display_name="Elegant Switch",
            search_aliases=["switch", "toggle", "boolean", "bool", "true", "false", "if", "select", "on off", "split", "route", "router", "demux", "branch"],
            category="elegant",
            description="pick input: output_1 is input_1 (switch on) or input_2 (off); an input with nothing "
            "connected outputs the plain true or false. pick output: the switch decides which of output_1 / "
            "output_2 is active; the other is blocked, so nodes fed only by it do not run.",
            inputs=[
                io.Boolean.Input(
                    "switch",
                    default=True,
                    label_on="1",
                    label_off="2",
                    tooltip="pick input: 1 outputs input_1, 2 outputs input_2. "
                    "pick output: 1 activates output_1, 2 activates output_2.",
                ),
                # lazy: ComfyUI asks check_lazy_status below which of the two to run first.
                io.AnyType.Input(
                    "on_true",
                    display_name="input_1",
                    optional=True,
                    lazy=True,
                    tooltip="Used when the switch is 1. Empty (pick input): outputs true. "
                    "pick output: the value for output_1.",
                ),
                io.AnyType.Input(
                    "on_false",
                    display_name="input_2",
                    optional=True,
                    lazy=True,
                    tooltip="Used when the switch is 2. Empty (pick input): outputs false. "
                    "pick output: the value for output_2; empty: input_1 goes to the active output.",
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
                # Last, so workflows saved before keep their widget values.
                io.Combo.Input(
                    "mode",
                    options=["pick input", "pick output"],
                    default="pick input",
                    optional=True,
                    tooltip="pick input: two inputs, the switch chooses which one is output. "
                    "pick output: the switch chooses which of two outputs is active.",
                ),
            ],
            outputs=[
                io.AnyType.Output(display_name="output_1"),
                io.AnyType.Output(display_name="output_2", tooltip="pick output only; blocked in pick input."),
            ],
        )

    @classmethod
    def check_lazy_status(cls, **kwargs) -> list[str]:
        # ComfyUI raises an error when asked for an input that is not connected, and it leaves unconnected
        # optional inputs out of kwargs. So ask only for inputs that are in kwargs as None: connected, not run yet.
        wanted = ["on_true", "on_false"]  # lazy_evaluation off: both, as a node without lazy inputs does
        if kwargs.get("lazy_evaluation", False) and kwargs.get("mode", "pick input") == "pick input":
            wanted = ["on_true" if kwargs.get("switch", True) else "on_false"]
        return [name for name in wanted if name in kwargs and kwargs[name] is None]

    @classmethod
    def execute(
        cls, switch: bool, on_true=None, on_false=None, lazy_evaluation: bool = False, mode: str = "pick input"
    ) -> io.NodeOutput:
        # A blocked output silently skips the nodes fed only by it.
        from comfy_execution.graph import ExecutionBlocker

        blocked = ExecutionBlocker(None)
        if mode == "pick output":
            if on_false is None:
                on_false = on_true  # one input: it goes to whichever output is active
            return io.NodeOutput(on_true if switch else blocked, blocked if switch else on_false)
        chosen = on_true if switch else on_false
        # Nothing connected on the chosen side: send the switch itself.
        return io.NodeOutput(bool(switch) if chosen is None else chosen, blocked)
