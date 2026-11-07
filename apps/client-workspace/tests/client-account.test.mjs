import test from 'node:test';
import assert from 'node:assert/strict';
import { safeClientResourceUrl, isUuid, clientRegistrationOrigin } from '../src/lib/client-account.ts';
test('published resources allow only public HTTPS navigation without credentials',()=>{
 assert.equal(safeClientResourceUrl('https://example.com/features?tab=calendar'),'https://example.com/features?tab=calendar');
 for(const url of ['javascript:alert(1)','http://example.com','https://user:secret@example.com','https://localhost/foo','https://127.0.0.1','https://[::1]/','https://server.local','data:text/html,hello','not a url']) assert.equal(safeClientResourceUrl(url),null,url);
});
test('client resource and membership identifiers require complete UUIDs',()=>{
 assert.equal(isUuid('11111111-1111-4111-8111-111111111111'),true);
 for(const value of [null,'','x'.repeat(36),'11111111-1111-4111-8111-111111111111 OR true']) assert.equal(isUuid(value),false);
});

test('client registration keeps PKCE signup and confirmation on canonical host',()=>{
 assert.equal(clientRegistrationOrigin('https://emberweb.co.za','production'),'https://emberweb.co.za');
 for(const origin of [null,'https://portal.emberweb.co.za','https://www.emberweb.co.za','https://evil.example','https://emberweb.co.za.evil.example','http://localhost:3000']) assert.equal(clientRegistrationOrigin(origin,'production'),null);
 assert.equal(clientRegistrationOrigin('http://localhost:3000','development'),'http://localhost:3000');
 assert.equal(clientRegistrationOrigin('http://localhost:3000/path','development'),null);
});
