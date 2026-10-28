/* All quantities and benefits in this file are illustrative prototype data. */
window.FB = window.FB || {};
window.FB.data = {
  villageLevel: 2,
  resources: [
    { id: 'wood', amount: 240 },
    { id: 'stone', amount: 120 },
    { id: 'fruit', amount: 85 },
    { id: 'ticket', amount: 5 }
  ],
  buildings: [
    { id: 'hall', level: 2, status: 'built', cost: { wood: 160, stone: 80 }, productKey: 'building.hall.product' },
    { id: 'orchard', level: 1, status: 'built', cost: { wood: 80, stone: 30 }, productKey: 'building.orchard.product' },
    { id: 'kitchen', level: 1, status: 'built', cost: { wood: 100, stone: 50 }, productKey: 'building.kitchen.product' },
    { id: 'workshop', level: 0, status: 'available', cost: { wood: 120, stone: 60 }, productKey: 'building.workshop.product' }
  ],
  characters: [
    { id: 'mira', role: 'gardener', stats: { gardening: 92, processing: 36, construction: 24 }, bestBuilding: 'orchard', bonus: 12 },
    { id: 'jasper', role: 'processor', stats: { gardening: 30, processing: 94, construction: 38 }, bestBuilding: 'kitchen', bonus: 15 },
    { id: 'rowan', role: 'builder', stats: { gardening: 28, processing: 42, construction: 91 }, bestBuilding: 'workshop', bonus: 10 }
  ],
  defaultAssignments: { orchard: 'mira', kitchen: 'jasper', workshop: null },
  stage: {
    number: 1,
    moves: 18,
    goals: [{ fruit: 'apple', amount: 12 }, { fruit: 'grape', amount: 9 }],
    rewards: { wood: 30, stone: 15, fruit: 20, ticket: 1 }
  }
};
