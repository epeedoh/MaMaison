// Local-only acceptance against the packaged API, Angular app and a fresh synthetic SQL database.
const { chromium } = require('playwright');
const { spawn, spawnSync } = require('node:child_process');
const { randomBytes, createHash } = require('node:crypto');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const assert = require('node:assert/strict');
const { setTimeout: wait } = require('node:timers/promises');
const [pkg, db] = process.argv.slice(2);
assert(pkg && /^MaMaison_RolesQa_[a-f0-9]{10}$/.test(db), 'Expected release directory and isolated scratch DB');
const base = path.resolve(pkg), web = path.join(base,'browser'), api = path.join(base,'publish');
const roles = 'Visiteur Acheteur Locataire Proprietaire Promoteur Demarcheur AgentImmobilier VerificateurTerrain Admin SuperAdmin Support Partenaire'.split(' ');
const publishers = new Set([3,4,5,6,8,9]);
const pwd = randomBytes(24).toString('hex');
const digest = createHash('sha256').update(pwd).digest('hex').toUpperCase();
const tel = n => '000099'+String(n).padStart(4,'0');
const root = fs.mkdtempSync(path.join(os.tmpdir(),'mamaison-roles-'));
let server, proc, browser;
const users = [], listings = {};
const listen = s => new Promise((resolve,reject)=>s.once('error',reject).listen(0,'127.0.0.1',()=>resolve(s.address().port)));
async function run() {
  const seed = "IF DB_NAME() <> '"+db+"' OR EXISTS(SELECT 1 FROM Utilisateurs) THROW 51000,'Not an empty QA database',1;\n"
    +roles.slice(5).map((_,i)=>{const n=i+5;return "INSERT INTO Utilisateurs(Id,Nom,Telephone,MotDePasseHash,Role,EstActif,TelephoneVerifie,DateCreation) VALUES(NEWID(),'QA "+roles[n]+"','"+tel(n)+"','"+digest+"',"+n+",1,1,SYSUTCDATETIME());";}).join('\n');
  const seeded = spawnSync('sqlcmd',['-E','-b','-S','(localdb)\\MSSQLLocalDB','-d',db],{input:seed+'\nGO\n',stdio:['pipe','pipe','pipe']});
  assert.equal(seeded.status,0,'Could not seed empty synthetic database');
  const reserve = http.createServer(), port = await listen(reserve);
  await new Promise(r=>reserve.close(r));
  const origin = 'http://127.0.0.1:'+port;
  proc=spawn('dotnet',[path.join(api,'MaMaison.Api.dll')],{cwd:api,stdio:'ignore',env:{...process.env,
    ASPNETCORE_URLS:origin, ASPNETCORE_ENVIRONMENT:'Production', DOTNET_ENVIRONMENT:'Production',
    ConnectionStrings__MaMaison:'Server=(localdb)\\MSSQLLocalDB;Database='+db+';Integrated Security=true;TrustServerCertificate=true',
    Jwt__Secret:randomBytes(48).toString('hex'), MAMAISON_PRIVATE_DOCUMENTS:root}});
  for(let i=0;i<80;i++){if(await fetch(origin+'/api/fonctionnalites').then(r=>r.ok).catch(()=>false))break;
    assert.equal(proc.exitCode,null,'Isolated API stopped');await wait(500);}
  async function req(n,method,url,expected,body){
    const h={}, form=body instanceof FormData;
    if(n!==null)h.Authorization='Bearer '+users[n].token;
    if(body!==undefined&&!form)h['Content-Type']='application/json';
    const r=await fetch(origin+'/api/'+url,{method,headers:h,body:body===undefined?undefined:form?body:JSON.stringify(body)});
    assert.equal(r.status,expected,roles[n]+' '+method+' '+url+': HTTP '+r.status);
    return r.headers.get('content-type')?.includes('application/json')?r.json():null;
  }
  const basic={titre:'Fixture',typeBien:0,commune:'Cocody',quartier:'Riviera',nombrePieces:3,loyer:150000,caution:0,avance:0};
  for(let n=0;n<roles.length;n++){
    const cmd={telephone:tel(n),motDePasse:pwd,role:n,nom:'QA '+roles[n]};
    users[n]=await req(null,'POST','auth/'+(n<5?'register':'login'),n<5?201:200,cmd);
    assert.equal((await req(n,'GET','profil',200)).role,n);
    await req(n,'GET','admin/demandes',n===8||n===9?200:403);
    const l=await req(n,'POST','locations',publishers.has(n)?201:403,{...basic,pourMonCompte:n===3});
    if(l){listings[n]=l.id;const [info]=await req(n,'GET','profil/locations',200);
      assert.equal(info.deposant,true);assert.equal(info.proprietaire,n===3);}
  }
  const id=listings[5], dossier='dossiers-location/'+id+'/',docs='biens/'+id+'/justificatifs',admin='admin/locations/'+id+'/';
  await req(5,'PUT',dossier+'responsable',404,{telephone:tel(6)});
  await req(8,'PUT',admin+'valider',400);
  await req(8,'PUT',admin+'rejeter',200,'Verifier le loyer');
  assert.equal((await req(5,'GET','profil/locations',200))[0].motifRejet,'Verifier le loyer');
  await req(5,'PUT',dossier+'corriger',204,{...basic,titre:'Maison recette',pieces:3,frais:0});
  for(const categorie of ['Propriete','IdentiteProprietaire']){
    const f=new FormData();f.set('categorie',categorie);f.set('file',new Blob(['%PDF-1.4 QA only']), 'qa.pdf');
    const d=await req(5,'POST',docs,200,f);await req(8,'PUT',docs+'/'+d.id+'/valider',200);
    await req(5,'GET',docs+'/'+d.id,404);
  }
  await req(8,'PUT',dossier+'proprietaire',204,{telephone:tel(3)});
  await req(3,'PUT',dossier+'responsable',204,{telephone:tel(6)});
  await req(8,'PUT',admin+'valider',200);
  const contact={bienId:id,nom:users[2].nom,telephone:users[2].telephone};
  const v=await req(2,'POST','demandesvisite',201,{...contact,nature:'visite'});
  const rappel=await req(2,'POST','demandesvisite',201,{...contact,nature:'rappel'});
  const visites=await req(6,'GET',dossier+'visites',200);assert.deepEqual(visites.map(d=>d.id),[v.id]);
  await req(6,'GET',docs,404);await req(5,'GET',dossier+'visites',404);
  const slot = new Date(Date.now()+86400000); slot.setUTCHours(14,35,0,0);
  await req(6,'PUT',dossier+'visites/'+v.id+'/confirmer',204,{date:slot.toISOString()});
  await req(8,'PUT','admin/demandes/'+rappel.id+'/repondre',204,'Rappel programme');
  const types = {'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2','.jpg':'image/jpeg'};
  server=http.createServer((q,s)=>{
    const u=new URL(q.url,'http://localhost');
    if(u.pathname.startsWith('/api/')){const t=http.request(origin+q.url,{method:q.method,headers:q.headers},r=>{s.writeHead(r.statusCode,r.headers);r.pipe(s);});t.on('error',()=>{s.writeHead(502);s.end();});q.pipe(t);return;}
    let file=path.resolve(web,'.'+decodeURIComponent(u.pathname));
    if(!file.startsWith(web+path.sep)&&file!==web){s.writeHead(403);s.end();return;}
    if(!fs.existsSync(file)||!fs.statSync(file).isFile())file=path.join(web,'index.html');
    s.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(s);
  });
  const ui='http://127.0.0.1:'+await listen(server);
  browser=await chromium.launch({channel:'chrome',headless:true});
  for(let n=0;n<roles.length;n++){
    const ctx=await browser.newContext({timezoneId:'America/Toronto',viewport:n%2?{width:390,height:844}:{width:1366,height:900},serviceWorkers:'block'});
    await ctx.addInitScript(x=>{localStorage.setItem('mm_token',x.token);localStorage.setItem('mm_user',JSON.stringify(x));},users[n]);
    const p=await ctx.newPage();p.setDefaultTimeout(10000);await p.goto(ui+'/profil');
    await p.locator('.account-details').getByText('QA '+roles[n],{exact:true}).waitFor();
    assert.equal(await p.getByRole('button',{name:'Mes annonces',exact:true}).count(),publishers.has(n)?1:0);
    assert.equal(await p.locator('#activity-title').locator('..').getByRole('link',{name:'Administration',exact:true}).count(),[8,9].includes(n)?1:0);
    if(publishers.has(n)){
      await p.getByRole('button',{name:'Mes annonces',exact:true}).click();
      const card=[3,5,6].includes(n)?p.locator('article.listing').filter({hasText:'Maison recette'}):p.locator('article.listing').first();
      await card.locator('summary').first().click();
      if([3,5,6].includes(n)){
        assert.equal(await card.locator('summary').filter({hasText:'Responsable des visites'}).count(),n===3?1:0);
        assert.equal(await card.getByRole('heading',{name:'Visites reçues'}).count(),n===6?1:0);
        if(n===6)await card.getByText(/Confirmée :/).waitFor();
      }
    }else{
      await p.getByRole('button',{name:'Mes demandes envoyées',exact:true}).last().click();
      if(n===2){await p.getByText(/Rappel programme/).waitFor();await p.getByText(/Rendez-vous :.*14:35.*Abidjan/).waitFor();}
      else await p.getByText('Aucune demande envoyée',{exact:true}).waitFor();
    }
    await ctx.close();console.log('Browser + API OK: '+roles[n]);
  }
  await req(3,'PUT',dossier+'responsable',204,{telephone:null});
  await req(6,'GET',dossier+'visites',404);
  assert.equal((await req(3,'GET',dossier+'visites',200)).length,1);
  console.log('Delegation revocation confirmed.');
}
run().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(async()=>{
  if(browser)await browser.close();if(server){server.closeAllConnections();server.close();}
  if(proc)proc.kill();
});
