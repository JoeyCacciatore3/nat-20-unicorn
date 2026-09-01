// Hash every zone's grid so a refactor can be proven behavior-identical.
import { createHash } from 'crypto';
import { grid, loadZone } from '../src/world.js';
let out = [];
for (let z = 0; z < 5; z++) {
  loadZone(z);
  const h = createHash('sha1').update(Buffer.from(grid)).digest('hex').slice(0, 12);
  out.push(`Z${z} ${h}`);
}
console.log(out.join('  '));
