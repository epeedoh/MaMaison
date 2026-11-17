// Isolated browser fixtures. No request is forwarded to a real API.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(process.argv[2]);
const port = Number(process.argv[3] || 4391);
const mime = { '.html':'text/html', '.js':'application/javascript', '.mjs':'application/javascript',
  '.css':'text/css', '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg',
  '.webp':'image/webp', '.svg':'image/svg+xml', '.woff2':'font/woff2', '.gltf':'model/gltf+json', '.glb':'model/gltf-binary' };
const id = '11111111-1111-4111-8111-111111111111';
const villas = [{ id, titre:'Villa de test - Cocody', quartier:'Riviera', ville:'Abidjan',
  prix:45000000, surfaceHabitable:180, nombrePieces:5, imagePrincipaleUrl:null, type:0,
  scoreMaMaison:0, medias:[], pointsVisite:[], description:'Annonce synthétique pour la recette locale.',
  promoteurNom:'Compte de test', modele3DUrl:null }];
const send = (res, data, status=200) => { res.writeHead(status, { 'Content-Type':'application/json', 'Cache-Control':'no-store' }); res.end(JSON.stringify(data)); };
http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  if (url.pathname === '/site-config.json') return send(res, { demo3dEnabled:true, whatsappNumber:'' });
  if (url.pathname.startsWith('/api/')) {
    if (req.method === 'POST' && url.pathname === '/api/auth/login') {
      let raw=''; for await (const part of req) { raw+=part; if(raw.length>4096) return send(res,{},413); }
      let body; try { body=JSON.parse(raw); } catch { return send(res,{},400); }
      const role=body.telephone === '0700000008' ? 8 : body.telephone === '0700000003' ? 3 : 2;
      return send(res, { utilisateurId:id, token:`fixture-${role}`, expiration:'2030-01-01T00:00:00Z',
        nom:'Compte de recette', telephone:body.telephone, role });
    }
    if(req.method !== 'GET') return send(res, {message:'Aucune écriture dans cet aperçu.'},405);
    const p=url.pathname;
    if(p === '/api/fonctionnalites') return send(res,{terrainsActifs:true});
    if(p === '/api/villas') return send(res,{items:villas,total:1,page:1,pageSize:6,totalPages:1});
    if(p === `/api/villas/${id}`) return send(res,villas[0]);
    if(p === '/api/locations' || p === '/api/terrains') return send(res,{items:[],total:0,page:1,totalPages:0});
    if(p === '/api/profil') return send(res,{id,nom:'Compte de recette',telephone:'0700000002',email:null,
      role:Number((req.headers.authorization || '').split('-').at(-1)) || 2,dateInscription:'2026-11-17T00:00:00Z'});
    if(p === '/api/profil/stats') return send(res,{nbDemandes:0,nbLocations:0,nbSignalements:0});
    if(p === '/api/admin/site-config') return send(res,{demo3dEnabled:true,version:id,updatedAt:null});
    if(p === '/api/admin/dashboard') return send(res,{villas:{publiees:1,total:1,enValidation:0},
      locations:{publiees:0,total:0,enVerification:0},demandesVisite:{enAttente:0,total:0},
      signalements:{enAttente:0},terrains:{publies:0,total:0},utilisateurs:1});
    if(p.startsWith('/api/admin/') || p.startsWith('/api/profil/') || p === '/api/demarcheurs') return send(res,[]);
    return send(res,{},404);
  }
  let file = path.resolve(root,'.'+decodeURIComponent(url.pathname));
  if(!file.startsWith(root+path.sep)) file=path.join(root,'index.html');
  if(!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    if(path.extname(file)) return send(res,{},404);
    file=path.join(root,'index.html');
  }
  res.writeHead(200,{'Content-Type':mime[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-store'});
  fs.createReadStream(file).pipe(res);
}).listen(port,'127.0.0.1',()=>console.log(`Synthetic preview: http://127.0.0.1:${port}`));
