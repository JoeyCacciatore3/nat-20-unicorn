// dm.js — the Dungeon Master's voice. Shuffle-bag pools, no repeats until a bag empties.
const POOLS = {
  start: [
    'Fine. One more scene. Only because you rolled well.',
  ],
  crit: [
    "NAT TWENTY. Okay. Okay! I'm rewriting this room for you.",
    'Twenty! The dice remember you, little horse.',
  ],
  fumble: [
    'A one. The unicorn trips over nothing. Majestic.',
  ],
  fall: [
    "...I'll just put you back.",
  ],
  kill: [
    'One less doubt on the table.',
    'The gloom flinches. Interesting.',
  ],
  hurt: [
    'Careful — I only painted one of you.',
    'Ow. I felt that from up here.',
  ],
  dead: [
    'Aaand the unicorn is down. Lucky I never erase anyone.',
  ],
  sleep: ['Rest. Even imaginary legs get tired.'],
};
const bags = new Map();
let show = () => {};
export const onSay = (f) => show = f;
export { POOLS as P }; // dot-accessed (DM.P.crit) so the prop mangler shortens pool names
export const say = (pool) => {
  let b = bags.get(pool);
  if (!b || !b.length) { b = [...pool]; bags.set(pool, b); }
  show(b.splice(Math.random() * b.length | 0, 1)[0]);
};
export const line = (t) => show(t); // ordered story beats bypass the bags
