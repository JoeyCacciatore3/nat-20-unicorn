// Hash the world grid so a refactor can be proven behavior-identical.
import { createHash } from 'crypto';
import { grid } from '../src/world.js';
const h = createHash('sha1').update(Buffer.from(grid)).digest('hex').slice(0, 12);
console.log(`MEADOW ${h}`);
