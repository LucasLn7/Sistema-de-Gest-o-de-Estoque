/* Servidor de arquivos estáticos para apresentação local; a persistência da demonstração pertence ao navegador. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, 'public');
const PORT = Number(process.env.PORT || 3000);
const MIME = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.mjs':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
http.createServer((req,res) => {
  if (!['GET','HEAD'].includes(req.method)) {res.writeHead(405,{'Allow':'GET, HEAD'});res.end();return;}
  let requested;
  try {requested=decodeURIComponent(new URL(req.url,'http://localhost').pathname);} catch {res.writeHead(400);res.end('URL inválida');return;}
  const file = path.resolve(root,'.'+(requested==='/'?'/index.html':requested));
  if (file !== root && !file.startsWith(root+path.sep)) {res.writeHead(403);res.end('Acesso negado');return;}
  fs.readFile(file,(error,body)=>{
    if(error){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Arquivo não encontrado');return;}
    res.writeHead(200,{'Content-Type':MIME[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});
    res.end(req.method==='HEAD'?undefined:body);
  });
}).listen(PORT,'127.0.0.1',()=>console.log(`StockOS: http://localhost:${PORT}`));
