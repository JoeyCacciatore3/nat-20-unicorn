// dm.js — the Dungeon Master's voice. Shuffle-bag pools, no repeats until a bag empties.
const POOLS = {
  start: [
    'Fine. One more scene. But only because you rolled well.',
    "The table's a mess. Ignore that. Where were we...",
  ],
  crit: [
    "NAT TWENTY. Okay. Okay! I'm rewriting this room for you.",
    'Twenty! The dice remember you, little horse.',
  ],
  fumble: [
    'A one. The unicorn trips over nothing. Majestic.',
    "Nat 1. Let's agree no one saw that.",
  ],
  fall: [
    "...I'll just put you back.",
    'Minis do not bounce. Back you go.',
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
    'Aaand the unicorn is down. Lucky for you I never erase anyone.',
    'Down you go. Back to the last place that felt safe.',
  ],
  build: [
    "Huh. I didn't glue that there. I like it.",
    "The diorama grows. I'm... invested. Slightly.",
  ],
  sleep: ['Rest. Even imaginary legs get tired.'],
  raid: [
    'The gloom does not like losing chapters. Incoming.',
    'Doubt marches on your little house. Hold it.',
  ],
  pass: [
    'That... actually worked. Noted.',
    'Fine. FINE. It works. Take it.',
  ],
  fail: [
    'The dice have spoken, and they are laughing.',
    'No. But points for the confident face.',
  ],
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
