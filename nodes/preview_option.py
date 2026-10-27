from comfy_api.latest import io


def show_preview_input():
    """The advanced switch of the nodes with a preview box; web/js/text_preview.js shows or hides the box."""
    return io.Boolean.Input(
        "show_preview",
        default=True,
        optional=True,
        label_on="on",
        label_off="off",
        advanced=True,
        tooltip="Show the preview box on the node. The result is still made and output when it is off.",
    )
