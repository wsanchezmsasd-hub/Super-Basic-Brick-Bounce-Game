const GAME_CONFIG = {
  fallingPieces: {
    startingPieces: 5
  },
  brainrots: {
    dropChance: 0.7
  },
  specialBlocks: {
    frenzy: {
      name: "Frenzy",
      label: "FRENZY",
      color: "#facc15",
      moneyMultiplier: 2,
      durationTurns: 2
    },
    mega: {
      name: "Mega",
      label: "MEGA",
      color: "#ef4444",
      minSize: 2,
      maxSize: 3,
      hits: 10,
      legendaryChance: 0.8
    }
  },
  singletons: {
    runtime: { Score: 0 },
    economy: {
      frenzyTurns: 0
    }
  }
};
