const GAME_CONFIG = {
  fallingPieces: {
    startingPieces: 5
  },
  brainrots: {
    dropChance: 0.7
  },
  adachiRei: {
    replacementChance: 0.005
  },
  floppa: {
    income: 1000
  }
};

// Apply the configured Floppa payout once game.js has initialized its upgrades.
window.addEventListener("load", () => {
  const floppaUpgrade = upgrades.find((upgrade) => upgrade.id === "floppa");
  if (!floppaUpgrade) return;

  const applyFloppaUpgrade = floppaUpgrade.apply;
  floppaUpgrade.description = `$${GAME_CONFIG.floppa.income.toLocaleString()} passive income. Protected from selling and stealing.`;
  floppaUpgrade.apply = function () {
    applyFloppaUpgrade.call(this);
    const acquiredFloppa = brainrots[brainrots.length - 1];
    if (acquiredFloppa?.rarity === "FLOPPA") {
      acquiredFloppa.income = GAME_CONFIG.floppa.income;
    }
    renderFactory();
  };
}, { once: true });
