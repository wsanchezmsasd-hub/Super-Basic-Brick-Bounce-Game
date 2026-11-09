const brainrotRarities = [
  { name: "Brainrot God", brainrotName: "la vaca saturno saturnita", image: "brainrotgod.png", chance: 1 / 256, color: "#ff3c8e", income: 18, sale: 160 },
  { name: "Mythical", brainrotName: "tralalelo tralala", image: "mythical.png", chance: 1 / 64, color: "#ff9b32", income: 7, sale: 60 },
  { name: "Legendary", brainrotName: "bombodido crocodilo", image: "legendary.png", chance: 1 / 32, color: "#ffe14a", income: 3, sale: 25 },
  { name: "Rare", brainrotName: "ballerina cappuccina", image: "rare.png", chance: 1 / 10, color: "#46f0dc", income: 1.25, sale: 10 },
  { name: "Uncommon", brainrotName: "lirili larila", image: "uncommon.png", chance: 1 / 4, color: "#76ed5a", income: 0.55, sale: 4 },
  { name: "Common", brainrotName: "Tung Tung Tung sahur", image: "common.png", chance: 1 / 2, color: "#aeb6c2", income: 0.2, sale: 2 },
  { name: "Secret", brainrotName: "Hatsune miku Plush", image: "Miku.jpg", chance: 0, color: "#f5f5f5", income: 500, sale: 4500 / SELL_VALUE_MULTIPLIER }
];

function createBrainrot(rarityName) {
  const rarity = brainrotRarities.find((item) => item.name === rarityName);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    rarity: rarity.name,
    name: rarity.brainrotName,
    defaultName: rarity.brainrotName,
    color: rarity.color,
    income: rarity.income,
    sale: rarity.sale,
    storedCash: 0,
    image: rarity.image
  };
}

function spawnBrickBrainrotDrop(brick) {
  if (brick.adachiRei) {
    if (brick.brainrotRarity !== "Secret") brick.brainrotRarity = "Secret";
    spawnBrainrotDrop("Secret", brick);
    return;
  }
  if (brick.brainrotRarity) spawnBrainrotDrop(brick.brainrotRarity, brick);
}
