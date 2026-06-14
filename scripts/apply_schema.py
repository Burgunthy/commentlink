#!/usr/bin/env python3
"""Apply schema.sql to Supabase via SQL statements."""
import urllib.request
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from load_secrets import load

secrets = load()
SERVICE_ROLE = secrets["SUPABASE_SERVICE_ROLE_KEY"]
SUPABASE_URL = secrets.get("NEXT_PUBLIC_SUPABASE_URL", "https://rzbpilxfwawwyxwxycku.supabase.co")

# Read schema
schema_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "supabase", "schema.sql")
with open(schema_path) as f:
    sql = f.read()

# Execute via Supabase /rest/v1/rpc/ doesn't work for DDL
# Use the internal pg query endpoint
headers = {
    "apikey": SERVICE_ROLE,
    "Authorization": f"Bearer {SERVICE_ROLE}",
    "Content-Type": "application/json",
}

def exec_sql(statement):
    """Execute a single SQL statement via Supabase."""
    # Split into individual statements and execute each
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/rpc/",
        data=json.dumps({}).encode(),
        headers=headers,
        method="POST"
    )
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        return resp.read().decode(), resp.status
    except urllib.error.HTTPError as e:
        return e.read().decode(), e.code

# Supabase doesn't support DDL via REST API.
# We need to use the management API or direct postgres connection.
# Let's use the Supabase SQL endpoint (requires management API token)
print("Supabase REST API doesn't support DDL statements.")
print("Attempting to use pg query endpoint...")

# Try the /pg/query endpoint (available in Supabase)
try:
    req = urllib.request.Request(
        f"{SUPABASE_URL}/pg/query",
        data=json.dumps({"query": sql}).encode(),
        headers=headers,
        method="POST"
    )
    resp = urllib.request.urlopen(req, timeout=60)
    result = resp.read().decode()
    print(f"Success! Response: {result[:500]}")
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"pg/query failed: {e.code} - {body[:300]}")
    print("\nNeed to use Supabase SQL Editor or management API.")
