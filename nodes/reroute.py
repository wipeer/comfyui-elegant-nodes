from comfy_api.latest import io


class ElegantReroute(io.ComfyNode):
    """Passes any value through unchanged. Look and size are in web/js/reroute.js."""

    @classmethod
    def define_schema(cls):
        # MatchType: the output takes the type of whatever is connected to the input, so
        # links keep their colour and type checks (a MODEL stays a MODEL after the reroute).
        template = io.MatchType.Template("value_type")
        return io.Schema(
            node_id="ElegantReroute",
            display_name="Elegant Simple Reroute",
            search_aliases=["reroute", "passthrough", "pass through", "any", "relay", "dot", "junction"],
            category="elegant",
            description="Passes any value through unchanged, to tidy links. Rename it by double-clicking "
            "the title; resize it down to a small square.",
            inputs=[io.MatchType.Input("value", template=template)],
            outputs=[io.MatchType.Output(template=template, id="value", display_name="value")],
        )

    @classmethod
    def execute(cls, value) -> io.NodeOutput:
        return io.NodeOutput(value)
