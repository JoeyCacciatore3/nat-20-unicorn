// dm.js — the Dungeon Master's voice. Shuffle-bag pools, no repeats until a bag empties.
const POOLS = {
  start: [
    'Fine. One more scene. But only because you rolled well.',
    "The table's a mess. Ignore that. Where were we...",
  ],
  crit: [
    "NAT TWENTY. Okay. Okay! I'm rewriting this room for you.",
    'Twenty! The dice remember you, little horse.',
    'A natural twenty. I... actually smiled. Huh.',
  ],
  fumble: [
    'A one. The unicorn trips over nothing. Majestic.',
    "Nat 1. Let's agree no one saw that.",
    'One. The gloom files that away for later.',
  ],
  fall: [
    "...I'll just put you back.",
    'Minis do not bounce. Back you go.',
    'The floor is not part of this campaign.',
  ],
  kill: [
    'One less doubt on the table.',
    'The gloom flinches. Interesting.',
    'Poof. Back to the shadow it crawled from.',
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
    'That was not in my notes. Keep going.',
  ],
  sleep: ['Rest. Even imaginary legs get tired.'],
};
const bags = {};
let show = () => {};
export const onSay = (f) => show = f;
export const say = (k) => {
  if (!bags[k] || !bags[k].length) bags[k] = [...POOLS[k]];
  show(bags[k].splice(Math.random() * bags[k].length | 0, 1)[0]);
};
