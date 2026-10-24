const GAME_CONFIG = {
  fallingPieces: {
    startingPieces: 5
  },
  brainrots: {
    dropChance: 0.7
  },
  // Floppa is shop-only: he never drops from bricks. Buy all 3 tiers to ascend.
  floppa: {
    name: "Floppa",
    image: "floppa.png",
    color: "#e0a458",
    costs: [25000, 75000, 150000],   // price of Floppa #1, #2, #3
    income: 40,                      // base income per volley, per Floppa
    rebirthBoost: 0.25               // +25% cash from brainrots per rebirth
  }
};
