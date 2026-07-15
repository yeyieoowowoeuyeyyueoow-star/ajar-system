"""
Entry point for the Ajar Flask application.

The routes import 'server.*' as an absolute package. This file creates that alias
before any route code is imported, so the package resolves correctly regardless
of the working directory name.
"""
import sys, os, types

here = os.path.dirname(os.path.abspath(__file__))

# Create a 'server' package alias that points to this directory
server_mod = types.ModuleType('server')
server_mod.__path__ = [here]
server_mod.__package__ = 'server'
server_mod.__file__ = os.path.join(here, '__init__.py')
sys.modules['server'] = server_mod

# Also add the parent dir to sys.path so sub-imports resolve via the alias
parent = os.path.dirname(here)
if parent not in sys.path:
    sys.path.insert(0, parent)

# Now we can safely import the app factory
from server.app import create_app  # noqa: E402

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port, debug=False)
