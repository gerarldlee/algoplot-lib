const https = require('https');

const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error('GITHUB_TOKEN environment variable is required');
  process.exit(1);
}

const body = JSON.stringify({
  tag_name: 'v0.4.0',
  target_commitish: 'main',
  name: 'algoplot 0.4.0',
  body: `## What's new

- **Octree viz structure** — \`viz.octree()\` with 3D axonometric projection view
- **@algoplot/markdown** — runtime DOM scanner that mounts live players onto \`\`\`\`algoplot\`\`\`\` fences in any rendered HTML
- **@algoplot/web** — renamed from @algoplot/element; same self-contained \`<algoplot-player>\` web component
- All packages updated to 0.4.0

## Packages

| Package | Version |
| --- | --- |
| @algoplot/core | 0.4.0 |
| @algoplot/python | 0.4.0 |
| @algoplot/react | 0.4.0 |
| @algoplot/remark | 0.4.0 |
| @algoplot/web | 0.4.0 |
| @algoplot/markdown | 0.4.0 |

Guides: https://gerarldlee.github.io/algoplot-lib/guides/getting-started/
API reference: https://gerarldlee.github.io/algoplot-lib/api/`,
  draft: false,
  prerelease: false,
});

const options = {
  hostname: 'api.github.com',
  path: '/repos/gerarldlee/algoplot-lib/releases',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'algoplot-release',
    'Content-Length': Buffer.byteLength(body),
  },
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    if (res.statusCode === 201) {
      const release = JSON.parse(data);
      console.log(`Release created: ${release.html_url}`);
    } else {
      console.error(`Failed (${res.statusCode}): ${data}`);
      process.exit(1);
    }
  });
});

req.on('error', (e) => {
  console.error(`Error: ${e.message}`);
  process.exit(1);
});

req.write(body);
req.end();
