import fs from 'fs';
import path from 'path';
import url from 'url';
import http from 'http';
import { parseArgs } from 'node:util';

import mime from 'mime-types';

const ROOT = path.resolve(url.fileURLToPath(import.meta.url), '..');
const PORT = 5173;

async function serve({root = ROOT, port = PORT, verbose}) {
  root = path.resolve(root);
  const server = http.createServer((req, res) => {
    let pathname = `.${url.parse(req.url).pathname}`;

    // simple routing
    if (pathname === './') {
      pathname = './index.html';
    }

    const filePath = path.join(root, pathname);
    const contentType = mime.lookup(path.extname(filePath)) || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, {'Content-Type': 'text/plain'});
        res.end('File not found');
        verbose && console.log('%s %s %s', req.method, req.url, '404');
        return;
      }

      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': Buffer.byteLength(data),
        'Cache-Control': 'no-store',
      });
      res.end(data);
      verbose && console.log('%s %s %s', req.method, req.url, '200');
    });
  });

  server.listen(port, () => {
    console.log('Serving is running at %s', `http://localhost:${port}`);
    console.log('Press Ctrl+C to exit.');
  });
}

async function main() {
  const args = parseArgs({
    options: {
      help: {
        type: 'boolean',
        short: 'h',
      },
      verbose: {
        type: 'boolean',
        short: 'v',
        default: false,
      },
      port: {
        type: 'string',
        default: PORT.toString(),
      },
    },
    allowPositionals: true,
  });

  if (args.values.help) {
    const usage = `\
Usage: node serve.js [ROOT] [options ...]

Options:
    --help | -h      Display usage help.
    --verbose | -b   Display verbose log.
    --port PORT      Specify the port to listen.
`;
    process.stdout.write(usage);
    process.exit(0);
  }

  const [root] = args.positionals;
  const {port, verbose} = args.values;

  const portInt = parseInt(port, 10);
  if (!(0 <= portInt && portInt <= 65535)) {
    console.error('Invalid port: %s', port);
    process.exit(1);
  }

  await serve({root, port: portInt, verbose});
}

await main();
