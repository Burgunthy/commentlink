#!/usr/bin/env python3
"""Set Vercel env vars for CommentLink project using secrets from .secrets/"""
import urllib.request
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from load_secrets import load

PROJECT_ID = "prj_D70reugcFtJuGUkI4vQsosq47Byp"
SECRETS = load()

SUPABASE_URL = "https://chlqqedndfrtratmsdaj.supabase.co"
APP_URL = "https://commentlink-xi.vercel.app"

env_vars = [
    ("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL, "plain"),
    ("NEXT_PUBLIC_SUPABASE_ANON_KEY", SECRETS["NEXT_PUBLIC_SUPABASE_ANON_KEY"], "plain"),
    ("SUPABASE_SERVICE_ROLE_KEY", SECRETS["SUPABASE_SERVICE_ROLE_KEY"], "encrypted"),
    ("NEXT_PUBLIC_APP_URL", APP_URL, "plain"),
]

token = SECRETS["VERCEL_TOKEN"]

for name, value, enc_type in env_vars:
    payload = json.dumps({
        "key": name,
        "value": value,
        "type": enc_type,
        "target": ["production", "preview", "development"]
    }).encode()

    req = urllib.request.Request(
        f"https://api.vercel.com/v10/projects/{PROJECT_ID}/env",
        data=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        },
        method="POST"
    )
    try:
        resp = urllib.request.urlopen(req, timeout=15)
        data = json.loads(resp.read())
        print(f"OK {name}")
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        # Already exists? Try to check
        if e.code == 409:
            print(f"EXISTS {name} (will update)")
        else:
            print(f"FAIL {name}: {e.code} - {body[:200]}")

print("\nDone!")
