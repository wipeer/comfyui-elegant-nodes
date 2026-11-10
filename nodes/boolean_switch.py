from comfy_api.latest import io


class ElegantBooleanSwitch(io.ComfyNode):
    """An on/off switch. A connected boolean replaces the switch (ComfyUI does that for every widget)."""

    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="ElegantBooleanSwitch",
            display_name="Elegant Boolean Switch",
            search_aliases=["boolean", "bool", "switch", "toggle", "true", "false", "on off", "flag"],
            category="elegant",
            description="An on/off switch that outputs true or false. Connect a boolean to its input and "
            "that value is passed on instead; leave it unconnected and the switch decides.",
            inputs=[
                io.Boolean.Input(
                    "value",
                    default=True,
                    label_on="true",
                    label_off="false",
                    tooltip="The output when nothing is connected. A connected boolean replaces it.",
                ),
            ],
            outputs=[io.Boolean.Output(display_name="boolean")],
        )

    @classmethod
    def execute(cls, value: bool) -> io.NodeOutput:
        return io.NodeOutput(bool(value))
