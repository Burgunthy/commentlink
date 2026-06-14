import os, json, urllib.request, urllib.parse, urllib.error

with open(os.path.expanduser('~/projects/auto-instagram/dmify/.secrets/meta.app_id')) as f:
    app_id = f.read().strip()
with open(os.path.expanduser('~/projects/auto-instagram/dmify/.secrets/meta.app_secret')) as f:
    app_secret = f.read().strip()

# 1. Get app access token
url = f'https://graph.facebook.com/oauth/access_token?client_id={app_id}&client_secret={app_secret}&grant_type=client_credentials'
resp = urllib.request.urlopen(url)
data = json.loads(resp.read())
access_token = data['access_token']
print(f"Token OK: {access_token[:10]}...")

# 2. Try setting app_domains via POST to settings
domain = 'commentlink-xi.vercel.app'
payload = urllib.parse.urlencode({
    'app_domains': f'["{domain}"]',
    'access_token': access_token,
    'method': 'post'
}).encode()

req = urllib.request.Request(
    f'https://graph.facebook.com/v25.0/{app_id}/settings',
    data=payload
)
try:
    resp = urllib.request.urlopen(req)
    print(f"Set domains result: {resp.read().decode()}")
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"Set domains failed ({e.code}): {body}")

# 3. Verify
req2 = urllib.request.Request(
    f'https://graph.facebook.com/v25.0/{app_id}?fields=app_domains,website_url&access_token={access_token}'
)
resp2 = urllib.request.urlopen(req2)
data2 = json.loads(resp2.read())
print(f"After: {data2}")

# 4. Also try setting website_url which some Meta apps use for domain validation
payload4 = urllib.parse.urlencode({
    'website_url': f'https://{domain}',
    'access_token': access_token,
    'method': 'post'
}).encode()
req4 = urllib.request.Request(
    f'https://graph.facebook.com/v25.0/{app_id}/settings',
    data=payload4
)
try:
    resp4 = urllib.request.urlopen(req4)
    print(f"Set website_url result: {resp4.read().decode()}")
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"Set website_url failed ({e.code}): {body}")
