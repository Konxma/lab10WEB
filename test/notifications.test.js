const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {io}=require('socket.io-client');
const {once}=require('node:events');
const {setTimeout:delay}=require('node:timers/promises');
const {CollectionsService}=require('../dist/notifications/collections.service');
const {MailService}=require('../dist/notifications/mail.service');
const base='http://127.0.0.1:3012';
const event=(socket,name)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(`Missing event: ${name}`)),4000);socket.once(name,data=>{clearTimeout(timer);resolve(data);});});
test('SMTP failure leaves DRAFT and emits no event',async()=>{
 let emitted=false;
 const service=new CollectionsService({emitToRoom(){emitted=true;}},{collectionTemplate(){return '';},async sendNotificationEmail(){throw Error('offline');}});
 await assert.rejects(service.startDrop(101,'buyer@example.com'),e=>e.getStatus()===502);
 assert.equal(service.findAll()[0].status,'DRAFT');assert.equal(emitted,false);
});
test('HTML template escapes collection title',()=>{
 const html=new MailService().collectionTemplate(101,'<script>alert(1)</script>');
 assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));
});
test('Socket.IO, rooms, SSE, REST and SMTP integration (Mailpit must run)',{timeout:30000},async t=>{
 const child=spawn(process.execPath,['dist/main.js'],{env:{...process.env,PORT:'3012'},stdio:'pipe'});
 let output='';child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);
 t.after(async()=>{child.kill();await once(child,'exit').catch(()=>{});});
 let ready=false;
 for(let i=0;i<70;i++){try{if((await fetch(`${base}/collections`)).ok){ready=true;break;}}catch{}await delay(100);}
 assert.ok(ready,output);
 const a=io(base,{autoConnect:false,transports:['websocket']}),b=io(base,{autoConnect:false,transports:['websocket']});
 t.after(()=>{a.close();b.close();});
 const connectedA=event(a,'connect'),connectedB=event(b,'connect');a.connect();b.connect();await Promise.all([connectedA,connectedB]);
 const pong=event(a,'pong');a.emit('ping');assert.ok((await pong).timestamp);
 const globalA=event(a,'globalAlert'),globalB=event(b,'globalAlert');a.emit('broadcastNotification','Тест трансляції');assert.equal((await globalA).message,'Тест трансляції');assert.equal((await globalB).message,'Тест трансляції');
 const invalid=event(a,'exception');a.emit('joinRoom','bad-room');assert.match((await invalid).message,/drop_/);
 await new Promise(resolve=>a.emit('joinRoom','drop_101',resolve));
 await new Promise(resolve=>b.emit('joinRoom','drop_101',resolve));
 await new Promise(resolve=>b.emit('leaveRoom','drop_101',resolve));
 let leaked=false;b.on('dropStarted',()=>leaked=true);
 const received=event(a,'dropStarted');
 const bad=await fetch(`${base}/collections/101/start`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({customerEmail:'invalid'})});assert.equal(bad.status,400);
 const res=await fetch(`${base}/collections/101/start`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({customerEmail:'integration@example.com'})});
 const body=await res.json();assert.equal(res.status,201,JSON.stringify(body));assert.equal(body.email.accepted,true);assert.equal((await received).status,'LIVE');
 await delay(200);assert.equal(leaked,false,'room event leaked to a socket that left');
 const duplicate=await fetch(`${base}/collections/101/start`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({customerEmail:'integration@example.com'})});assert.equal(duplicate.status,409);
 const missing=await fetch(`${base}/collections/999/start`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({customerEmail:'integration@example.com'})});assert.equal(missing.status,404);
 const abort=new AbortController();
 try {const stream=await fetch(`${base}/notifications/events/stream`,{signal:abort.signal});assert.match(stream.headers.get('content-type'),/text\/event-stream/);const reader=stream.body.getReader();let text='';while(!text.includes('data:')){const next=await reader.read();text+=new TextDecoder().decode(next.value);}assert.match(text,/connections/);}finally{abort.abort();}
 console.log('Verified: ping/pong, two-client broadcast, join/leave isolation, dropStarted, SMTP, 400/404/409, SSE');
});
