import os, json, urllib.request

with open(os.path.expanduser('~/projects/auto-instagram/dmify/.secrets/vercel.token')) as f:
    token = f.read().strip()

# List all deployments with more detail
url = 'https://api.vercel.com/v2/deployments?projectId=prj_D70reugcFtJuGUkI4vQsosq47Byp&limit=1'
req = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}'})
resp = urllib.request.urlopen(req)
data = json.loads(resp.read())

d = data['deployments'][0]
# Print all keys except sensitive ones
for k in sorted(d.keys()):
    val = d[k]
    if k in ['projectSettings', 'meta', 'config', 'scale', 'alias', 'regions']:
        continue  # skip verbose ones
    if isinstance(val, (dict, list)):
        val = json.dumps(val)
    if len(str(val)) > 300:
        val = str(val)[:300] + '...'
    print(f"{k}: {val}")
