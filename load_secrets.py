#!/usr/bin/env python3
"""
Load secrets from .secrets/ into environment variables.
Call: eval "$(python3 load_secrets.py)"

Design:
- Each secret is a SEPARATE FILE in .secrets/ (one key per file).
- .env.local is GENERATED from .secrets/ — never hand-edited.
- This prevents accidental overwrites: writing one secret can't destroy another.

Secrets:
  .secrets/vercel.token          → VERCEL_TOKEN
  .secrets/supabase.anon         → NEXT_PUBLIC_SUPABASE_ANON_KEY
  .secrets/supabase.service_role → SUPABASE_SERVICE_ROLE_KEY
"""
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SECRETS_DIR = os.path.join(SCRIPT_DIR, ".secrets")

MAPPING = {
    "vercel.token": "VERCEL_TOKEN",
    "supabase.anon": "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "supabase.service_role": "SUPABASE_SERVICE_ROLE_KEY",
}

EMPTY = ""
STATIC_VARS = {
    "NEXT_PUBLIC_SUPABASE_URL": "https://rzbpilxfwawwyxwxycku.supabase.co",
    "NEXT_PUBLIC_APP_URL": "https://commentlink-xi.vercel.app",
    "META_APP_ID": EMPTY,
    "META_APP_SECRET": EMPTY,
    "META_VERIFY_TOKEN": EMPTY,
}


def load():
    """Return dict of env vars loaded from .secrets/ files."""
    result = {}
    for filename, env_name in MAPPING.items():
        filepath = os.path.join(SECRETS_DIR, filename)
        if os.path.exists(filepath):
            with open(filepath) as f:
                value = f.read().strip()
            if value:
                result[env_name] = value
        else:
            print(f"WARNING: {filepath} not found", file=sys.stderr)
    return result


def generate_env_local():
    """Regenerate .env.local from .secrets/ + static vars."""
    secrets = load()
    lines = ["# AUTO-GENERATED from .secrets/ — DO NOT EDIT MANUALLY", ""]
    for k, v in {**STATIC_VARS, **secrets}.items():
        lines.append(f"{k}={v}")
    lines.append("")
    env_path = os.path.join(SCRIPT_DIR, ".env.local")
    with open(env_path, "w") as f:
        f.write("\n".join(lines))
    print(f"Generated {env_path}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--generate":
        generate_env_local()
    else:
        # Shell export format: eval "$(python3 load_secrets.py)"
        for k, v in load().items():
            print(f"export {k}={v}")
