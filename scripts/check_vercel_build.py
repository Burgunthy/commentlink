import os, json, urllib.request

with open(os.path.expanduser('~/projects/auto-instagram/dmify/.secrets/vercel.token')) as f:
    token = f.read().strip()

url = 'https://api.vercel.com/v2/deployments?projectId=prj_D70reugcFtJuGUkI4vQsosq47Byp&limit=1'
req = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}'})
resp = urllib.request.urlopen(req)
data = json.loads(resp.read())

d = data['deployments'][0]
print(f"State: {d['readyState']}")
print(f"URL: {d.get('url')}")
print(f"Created: {d.get('created')}")
