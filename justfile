# Justfile for serving docs via uvx
# Requires: uv (https://docs.astral.sh/uv/)

MKDOCS_WITH := "--with mkdocs-material --with pymdown-extensions"

default: docs

docs:
    uvx {{MKDOCS_WITH}} mkdocs serve -a 0.0.0.0:8000
