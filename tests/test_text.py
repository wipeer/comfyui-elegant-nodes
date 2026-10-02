from core.text import to_text, unescape


def test_to_text():
    assert to_text(None) == "None"
    assert to_text("hello") == "hello"
    assert to_text(42) == "42"
    assert to_text(0.5) == "0.5"
    assert to_text(True) == "True"
    assert to_text([1, 2]) == "[\n    1,\n    2\n]"
    assert to_text({"a": "é"}) == '{\n    "a": "é"\n}'
    assert to_text({1, 2}) == "{1, 2}"  # not JSON serializable: falls back to str()


def test_unescape():
    assert unescape(r"\n") == "\n"
    assert unescape(r"a\tb") == "a\tb"
    assert unescape(r"\\n") == "\\n"  # escaped backslash stays a literal backslash + n
    assert unescape(", ") == ", "
