from comfy_api.latest import io

# A width and a height on one link: the value is a core.resolution.Resolution.
ResolutionType = io.Custom("RESOLUTION")

# Named notes: a list of {"name", "value"} tabs, from Elegant Notes and read by Elegant Notes Merge.
NamedListType = io.Custom("NAMED_LIST")
