"""Bridge that lets Python code drive the JavaScript viz API.

Three things have to happen on every bridged call:

* the executing line is pushed to the recorder, because a JavaScript stack cannot see
  into a Python frame, so the editor's line highlight would never move;
* list/dict arguments are converted with ``to_js()``, because a raw ``PyProxy`` is
  ``typeof 'object'`` but *not* an ``Array`` - the diff and clone code in the recorder
  branches on ``Array.isArray()``, so an unconverted Python list would be walked as an
  object and every view would render blank. ``to_js`` is used rather than a proxy's own
  ``toJs()`` because the input arrives as native Python objects from ``json.loads``;
* ``None`` is carried as ``JsNull``, because Python's None would otherwise arrive as
  JavaScript ``undefined`` and silently drop keys from the struct data;
* ``snake_case`` attributes are resolved to their ``camelCase`` JavaScript spelling, so
  ``color_node`` finds ``colorNode``;
* a JavaScript array coming back is unwrapped with ``to_py()``, so ``a.to_array()``
  behaves like a real Python list instead of a proxy that cannot be indexed.

The user module gets ``viz`` (a proxy), ``input`` (decoded from JSON) and ``batched()``,
a context manager standing in for ``viz.batch(() => {...})``. Batching through the
context manager rather than by handing a Python callable to the JavaScript side avoids
proxying a closure into the other runtime on every batch.

Printing goes to stdout, which the host pipes into the log panel.
"""

import contextlib
import json
import sys

from pyodide.ffi import to_js

# Values that cross the boundary untouched: everything else is a viz struct.
_PLAIN = (bool, int, float, str, bytes, list, tuple, dict)


def _to_js(value):
    if isinstance(value, (list, tuple, dict)):
        return to_js(value)
    return value


def _camel(name):
    """snake_case to camelCase: color_node -> colorNode, to_array -> toArray."""
    head, *rest = name.split("_")
    if not rest:
        return name
    return head + "".join(p[:1].upper() + p[1:] for p in rest if p)


def _resolve(target, name):
    """Look the attribute up as written, then in its camelCase spelling."""
    attr = getattr(target, name, None)
    if attr is None:
        attr = getattr(target, _camel(name))
    return attr


def _wrap(value):
    if value is None or isinstance(value, _PLAIN):
        return value
    if _bridge.isArray(value):
        return value.to_py()
    return _Proxy(value)


class _Proxy:
    """Wraps a JS viz object, reporting the caller's line and normalising arguments."""

    def __init__(self, obj):
        object.__setattr__(self, "_obj", obj)

    def __getattr__(self, name):
        target = object.__getattribute__(self, "_obj")
        attr = _resolve(target, name)
        if not callable(attr):
            return _wrap(attr)

        def call(*args, **kwargs):
            # frame 0 is this closure, frame 1 is the line of user code that called it.
            _bridge.setLine(sys._getframe(1).f_lineno)
            return _wrap(
                attr(
                    *[_to_js(a) for a in args],
                    **{k: _to_js(v) for k, v in kwargs.items()},
                )
            )

        return call

    def __len__(self):
        target = object.__getattribute__(self, "_obj")
        length = getattr(target, "length", None)
        return length if isinstance(length, int) else len(target.toArray())

    def __repr__(self):
        return repr(object.__getattribute__(self, "_obj"))


@contextlib.contextmanager
def batched():
    """Stands in for viz.batch(() => { ... })."""
    _bridge.enterBatch()
    try:
        yield
    finally:
        _bridge.exitBatch()


def batch(fn):
    """Stands in for viz.batch(fn) when a callable is more convenient than a with block."""
    with batched():
        return fn()


viz = _Proxy(_js_viz)
input = json.loads(_input_json)
