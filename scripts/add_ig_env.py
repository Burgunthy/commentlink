import urllib.request
import json
import os, sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from load_secrets import load

PROJECT_ID = "prj_D70reugcFtJuGUkI4vQsosq47Byp"
ORG_ID = "team_JqJtrHdd7LQGVSbDWO00n2r3"
SECRETS = load()
TOKEN = SECRETS["VERCEL_TOKEN"]

# New env var to add: INSTAGRAM_CLIENT_ID
new_vars = [
    ("INSTAGRAM_CLIENT_ID", SECRETS["INSTAGRAM_CLIENT_ID"], "plain"),
]

for name, value, enc_type in new_vars:
    payload = json.dumps({
        "key": name,
        "value": value,
        "type": enc_type,
        "target": ["production", "preview", "development"]
    }).encode()

    req = urllib.request.Request(
        f"https://api.vercel.com/v10/projects/{PROJECT_ID}/env?teamId={ORG_ID}",
        data=payload,
        headers={
            "Authorization": f"Bearer {TOKEN}",
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
        if e.code == 409:
            print(f"EXISTS {name}")
        else:
            print(f"FAIL {name}: {e.code} - {body[:300]}")
