// ============================================================
// BLOCK BREAKER (base game)
//
// game.js  = the canvas, the ball, the paddle, and the game loop
// bricks.js     = where the bricks are and how they are drawn
// collisions.js = what happens when the ball touches things
// ============================================================

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const WIDTH = canvas.width;   // 600
const HEIGHT = canvas.height; // 800

const GameState = { Score: 0 };

// ------------------------------------------------------------
// THE BALL
// ------------------------------------------------------------
const BALL_SPEED = 4;
let permanentBallCount = 1;
let balls = [];
let pendingBallLaunches = [];
let aimAngle = 0;
let volleyActive = false;

function createBall(x, y, temporary = false) {
  return { x, y, width: 18, height: 18, vx: 0, vy: 0, state: "held", temporary };
}

function resetBalls() {
  balls = Array.from({ length: permanentBallCount }, () => createBall());
  pendingBallLaunches = [];
  volleyActive = false;
  positionHeldBalls();
}

function positionHeldBalls() {
  for (const ball of balls) {
    if (ball.state !== "held") continue;
    ball.x = paddle.x + paddle.width / 2 - ball.width / 2;
    ball.y = paddle.y - ball.height;
  }
}

// ------------------------------------------------------------
// THE PADDLE
// ------------------------------------------------------------
const paddle = {
  x: WIDTH / 2 - 45,
  y: HEIGHT - 45,
  width: 90,
  height: 12,
  speed: 7,
  velocity: 0,
  targetX: null,
  wallDirection: 0
};

// ------------------------------------------------------------
// FALLING TETRIS PIECES
// ------------------------------------------------------------
let bricks = [];
let enemyEntities = [];
let brainrots = [];
let fallingBrainrots = [];
let cashBalance = 0;
let factoryCapacity = 8;
let factoryFloors = 1;
let factoryMultiplier = 1;
let brainrotIncomeMultiplier = 1;
let brainrotDropMultiplier = 1;
let cloverStacks = 0;
const brainrotImageCache = new Map();
const particles = [];
const SELL_VALUE_MULTIPLIER = 21;
const BRAINROT_INCOME_EVENT_MULTIPLIER = 6;
const BRAINROT_INCOME_UPGRADE_STEP = 0.025;
const MAX_CLOVER_STACKS = 3;
let viewMode = "title";
let gameStarted = false;
let particleEffectsEnabled = true;
let gameSpeed = 1;
let gameMode = "playing";
let gameOverReason = "";

const upgrades = [
  {
    id: "floor2",
    name: "Factory: Floor 2",
    description: "+8 slots and a permanent 1.1x factory multiplier",
    cost: 120,
    maxPurchases: 1,
    apply() {
      factoryFloors += 1;
      factoryCapacity += 8;
      factoryMultiplier *= 1.1;
    }
  },
  {
    id: "floor3",
    name: "Factory: Floor 3",
    description: "+12 slots and a permanent 1.25x factory multiplier",
    cost: 640,
    maxPurchases: 1,
    apply() {
      factoryFloors += 1;
      factoryCapacity += 12;
      factoryMultiplier *= 1.25;
    }
  },
  {
    id: "automation",
    name: "Turbo Belts",
    description: "Brainrot income +2.5% per purchase",
    cost: 55,
    maxPurchases: 10,
    apply() {
      brainrotIncomeMultiplier = Number((brainrotIncomeMultiplier * (1 + BRAINROT_INCOME_UPGRADE_STEP)).toFixed(1));
    }
  },
  {
    id: "vault",
    name: "Mega Vault",
    description: "+6 factory slots per purchase",
    cost: 45,
    maxPurchases: 12,
    apply() {
      factoryCapacity += 6;
    }
  },
  {
    id: "dropRate",
    name: "Brainrot Magnet",
    description: "+10% brainrot drop chance per purchase",
    cost: 90,
    maxPurchases: 5,
    apply() {
      brainrotDropMultiplier *= 1.1;
    }
  },
  {
    id: "paddle",
    name: "Wide Catcher",
    description: "Paddle width +12% per purchase",
    cost: 70,
    maxPurchases: 5,
    apply() {
      paddle.width = Math.min(WIDTH * 0.55, paddle.width * 1.12);
    }
  },
  {
    id: "multiball",
    name: "Extra Launch",
    description: "+1 permanent ball per purchase",
    cost: 180,
    maxPurchases: 5,
    apply() {
      permanentBallCount += 1;
      resetBalls();
    }
  },
  {
    id: "brainroted-clover",
    name: "Brainroted Clover",
    description: "Each stack makes common/uncommon drops rarer and rare+ drops more common (max 3)",
    cost: 220,
    maxPurchases: MAX_CLOVER_STACKS,
    apply() {
      cloverStacks = Math.min(MAX_CLOVER_STACKS, cloverStacks + 1);
    }
  }
];

const brainrotRarities = [
  { name: "Brainrot God", brainrotName: "la vaca saturno saturnita", image: "brainrotgod.png", chance: 1 / 256, color: "#ff3c8e", income: 18, sale: 160 },
  { name: "Mythical", brainrotName: "tralalelo tralala", image: "mythical.png", chance: 1 / 64, color: "#ff9b32", income: 7, sale: 60 },
  { name: "Legendary", brainrotName: "bombodido crocodilo", image: "legendary.png", chance: 1 / 32, color: "#ffe14a", income: 3, sale: 25 },
  { name: "Rare", brainrotName: "ballerina cappuccina", image: "rare.png", chance: 1 / 10, color: "#46f0dc", income: 1.25, sale: 10 },
  { name: "Uncommon", brainrotName: "lirili larila", image: "uncommon.png", chance: 1 / 4, color: "#76ed5a", income: 0.55, sale: 4 },
  { name: "Common", brainrotName: "Tung Tung Tung sahur", image: "common.png", chance: 1 / 2, color: "#aeb6c2", income: 0.2, sale: 2 }
];

function update() {
  enemiesSystem(enemyEntities);
  movePaddle();
  updateParticles();

  if (gameMode === "gameover") {
    return;
  }

  updateFallingBrainrots();
  updatePendingBallLaunches();
  positionHeldBalls();
  if (!volleyActive) {
    return;
  }

  for (let index = balls.length - 1; index >= 0; index--) {
    const ball = balls[index];
    if (ball.state !== "active") continue;
    moveBall(ball);
    bounceOffWalls(ball);
    bounceOffPaddle(ball);
    bounceOffBottom(ball);
    if (ball.state === "active") bounceOffBricks(ball);
  }

  if (balls.every((ball) => ball.state === "held") && pendingBallLaunches.length === 0) {
    finishVolley();
  }
}

function scheduleExtraBall(x, y, vx, vy) {
  pendingBallLaunches.push({ x, y, vx, vy, ticksRemaining: 12 });
}

function updatePendingBallLaunches() {
  for (let index = pendingBallLaunches.length - 1; index >= 0; index--) {
    const launch = pendingBallLaunches[index];
    launch.ticksRemaining -= 1;
    if (launch.ticksRemaining > 0) continue;

    if (launch.ball) {
      launch.ball.x = paddle.x + paddle.width / 2 - launch.ball.width / 2;
      launch.ball.y = paddle.y - launch.ball.height;
      launch.ball.state = "active";
      launch.ball.vx = launch.vx;
      launch.ball.vy = launch.vy;
    } else {
      const extraBall = createBall(launch.x, launch.y, true);
      extraBall.state = "active";
      extraBall.vx = launch.vx;
      extraBall.vy = launch.vy;
      balls.push(extraBall);
    }
    pendingBallLaunches.splice(index, 1);
  }
}

function movePaddle() {
  const movingLeft = Boolean(keys["arrowleft"] || keys["a"]);
  const movingRight = Boolean(keys["arrowright"] || keys["d"]);
  let direction = Number(movingRight) - Number(movingLeft);
  if (paddle.wallDirection !== 0) {
    if (direction === paddle.wallDirection) {
      direction = 0;
    } else {
      paddle.wallDirection = 0;
    }
  }
  if (direction === 0 && paddle.targetX !== null) {
    direction = Math.sign(paddle.targetX - paddle.x);
    if (Math.abs(paddle.targetX - paddle.x) < 1) {
      paddle.targetX = null;
      direction = 0;
    }
  }

  paddle.velocity += (direction * paddle.speed - paddle.velocity) * 0.25;
  paddle.x += paddle.velocity;
  if (paddle.x < 0) {
    paddle.x = 0;
    paddle.velocity = Math.abs(paddle.velocity);
    paddle.targetX = null;
    paddle.wallDirection = -1;
  } else if (paddle.x + paddle.width > WIDTH) {
    paddle.x = WIDTH - paddle.width;
    paddle.velocity = -Math.abs(paddle.velocity);
    paddle.targetX = null;
    paddle.wallDirection = 1;
  }
}

function moveBall(ball) {
  ball.x = ball.x + ball.vx;
  ball.y = ball.y + ball.vy;
}

function updateAim(event) {
  const bounds = canvas.getBoundingClientRect();
  const pointerX = (event.clientX - bounds.left) * WIDTH / bounds.width;
  aimAngle = Math.max(-0.85, Math.min(0.85, (pointerX - WIDTH / 2) / WIDTH * 1.7));
}

function launchBalls() {
  if (viewMode !== "game" || gameMode !== "playing" || volleyActive || balls.length === 0) return;
  let launchIndex = 0;
  for (const ball of balls) {
    if (ball.state !== "held") continue;
    const launch = {
      ball,
      vx: Math.sin(aimAngle) * BALL_SPEED,
      vy: -Math.cos(aimAngle) * BALL_SPEED
    };
    if (launchIndex === 0) {
      ball.state = "active";
      ball.vx = launch.vx;
      ball.vy = launch.vy;
    } else {
      pendingBallLaunches.push({ ...launch, ticksRemaining: launchIndex * 8 });
    }
    launchIndex += 1;
  }
  volleyActive = true;
}

function finishVolley() {
  volleyActive = false;
  positionHeldBalls();
  if (gameMode !== "playing") return;

  clearCompletedRows();
  dropBoardRows(Math.random() < 0.5 ? 1 : 2);
  checkBottomRow();
  awardBrainrotIncome();
  if (gameMode !== "gameover") spawnFallingPiece();
}

function dropBoardRows(rowCount) {
  const bricksThatHitBottom = bricks.filter((brick) => brick.y + rowCount * BRICK_HEIGHT >= BOARD_BOTTOM);
  for (const brick of bricksThatHitBottom) stealBrainrots();
  bricks = bricks.filter((brick) => !bricksThatHitBottom.includes(brick));
  for (const brick of bricks) {
    brick.y += rowCount * BRICK_HEIGHT;
  }
}

function spawnFallingPiece() {
  const shapeOrder = TETROMINO_SHAPES
    .map((shape) => ({ shape, order: Math.random() }))
    .sort((a, b) => a.order - b.order);

  for (const { shape } of shapeOrder) {
    const shapeWidth = Math.max(...shape.map(([col]) => col)) + 1;
    const possibleColumns = Array.from(
      { length: BRICK_COLUMNS - shapeWidth + 1 },
      (_, column) => column
    ).sort(() => Math.random() - 0.5);

    for (const column of possibleColumns) {
      const positions = shape.map(([col, row]) => ({
        x: (column + col) * BRICK_WIDTH,
        y: BOARD_TOP + row * BRICK_HEIGHT
      }));
      const overlaps = positions.some((position) => bricks.some((brick) =>
        brick.x === position.x && brick.y === position.y
      ));
      if (overlaps) {
        continue;
      }

      const minimumStrength = Math.min(5, 1 + Math.floor(GameState.Score / 300));
      const effectIndex = Math.floor(Math.random() * positions.length);
      const effects = ["ROW", "BALL"];
      const effect = effects[Math.floor(Math.random() * effects.length)];
      const cells = positions.map(({ x, y }, index) =>
        createBrick(
          x,
          y,
          minimumStrength + Math.floor(Math.random() * (minimumStrength + 1)),
          index === effectIndex ? effect : null
        )
      );
      bricks.push(...cells);
      return true;
    }
  }

  endGame("THE STACK REACHED THE TOP");
  return false;
}

function clearCompletedRows() {
  for (let row = BRICK_ROWS - 2; row >= 0; row--) {
    const y = BOARD_TOP + row * BRICK_HEIGHT;
    const occupiedColumns = new Set(
      bricks.filter((brick) => brick.y === y).map((brick) => Math.round(brick.x / BRICK_WIDTH))
    );
    if (occupiedColumns.size !== BRICK_COLUMNS) {
      continue;
    }

    bricks = bricks.filter((brick) => brick.y !== y);
    for (const brick of bricks) {
      if (brick.y < y) {
        brick.y += BRICK_HEIGHT;
      }
    }
    row += 1;
  }
}

function checkBottomRow() {
  const bottomY = BOARD_BOTTOM - BRICK_HEIGHT;
  const occupiedColumns = new Set(
    bricks.filter((brick) => brick.y === bottomY).map((brick) => Math.round(brick.x / BRICK_WIDTH))
  );
  if (occupiedColumns.size === BRICK_COLUMNS) dropBoardRows(1);
}

function rollBrainrotRarity() {
  const rarityWeights = brainrotRarities.map((rarity) => {
    let weight = rarity.chance;
    if (cloverStacks > 0) {
      if (rarity.name === "Common" || rarity.name === "Uncommon") {
        weight *= Math.max(0.08, 1 - cloverStacks * 0.18);
      } else {
        weight *= 1 + cloverStacks * 0.25;
      }
    }
    return { rarity, weight };
  });

  const totalWeight = rarityWeights.reduce((total, entry) => total + entry.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const entry of rarityWeights) {
    roll -= entry.weight;
    if (roll <= 0) {
      return entry.rarity;
    }
  }

  return brainrotRarities[brainrotRarities.length - 1];
}

function createBrainrot(rarityName) {
  const rarity = brainrotRarities.find((item) => item.name === rarityName);
  if (!rarity) return null;
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    rarity: rarity.name,
    name: rarity.brainrotName,
    defaultName: rarity.brainrotName,
    color: rarity.color,
    income: rarity.income * 2,
    sale: Math.max(1, rarity.sale * 0.8),
    storedCash: 0,
    image: rarity.image
  };
}

function spawnParticles(x, y, color, count = 12) {
  if (!particleEffectsEnabled) return;
  for (let index = 0; index < count; index++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 4;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 2 + Math.random() * 4,
      life: 24 + Math.random() * 18,
      maxLife: 42,
      color
    });
  }
}

function updateParticles() {
  for (let index = particles.length - 1; index >= 0; index--) {
    const particle = particles[index];
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vx *= 0.97;
    particle.vy *= 0.97;
    particle.life -= 1;
    if (particle.life <= 0) particles.splice(index, 1);
  }
}

function getBrainrotImage(source) {
  const resolvedSource = source || "common.png";
  if (!brainrotImageCache.has(resolvedSource)) {
    const image = new Image();
    image.decoding = "async";
    image.onerror = () => {
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
          <rect width="128" height="128" fill="#160b1f"/>
          <circle cx="64" cy="46" r="24" fill="#f2b868"/>
          <rect x="36" y="66" width="56" height="30" rx="16" fill="#f4d274"/>
          <path d="M40 90 L64 112 L88 90" fill="none" stroke="#f4d274" stroke-width="10" stroke-linecap="round"/>
        </svg>
      `)}`;
    };
    image.src = resolvedSource;
    brainrotImageCache.set(resolvedSource, image);
  }
  return brainrotImageCache.get(resolvedSource);
}

function spawnBrainrotDrop(rarityName, brick) {
  const brainrot = createBrainrot(rarityName);
  if (!brainrot) return;
  fallingBrainrots.push({
    brainrot,
    x: brick.x + (brick.width - BRICK_WIDTH / 2) / 2,
    y: brick.y + (brick.height - BRICK_WIDTH / 2) / 2,
    width: BRICK_WIDTH / 2,
    height: BRICK_WIDTH / 2,
    velocityY: 0
  });
}

function updateFallingBrainrots() {
  for (let index = fallingBrainrots.length - 1; index >= 0; index--) {
    const drop = fallingBrainrots[index];
    drop.velocityY = Math.min(drop.velocityY + 0.12, 6);
    drop.y += drop.velocityY;

    if (boxesTouch(drop, paddle)) {
      if (brainrots.length < factoryCapacity) {
        brainrots.push(drop.brainrot);
        spawnParticles(drop.x + drop.width / 2, drop.y + drop.height / 2, drop.brainrot.color, 18);
        fallingBrainrots.splice(index, 1);
        renderFactory();
      }
      continue;
    }

    if (drop.y > HEIGHT) fallingBrainrots.splice(index, 1);
  }
}

function awardBrainrotIncome() {
  const multiplier = factoryMultiplier * brainrotIncomeMultiplier * BRAINROT_INCOME_EVENT_MULTIPLIER;
  for (const brainrot of brainrots) brainrot.storedCash += brainrot.income * multiplier;
  const grid = document.getElementById("factory-grid");
  if (!grid) return;
  for (const bank of grid.querySelectorAll("[data-bank]")) {
    const brainrot = brainrots.find((item) => item.id === bank.dataset.bank);
    if (brainrot) bank.textContent = `$${Math.floor(brainrot.storedCash).toLocaleString()} stored`;
  }
  for (const button of grid.querySelectorAll("[data-claim]")) {
    const brainrot = brainrots.find((item) => item.id === button.dataset.claim);
    if (brainrot) button.setAttribute("aria-label", `Collect $${Math.floor(brainrot.storedCash)} from ${brainrot.name}`);
  }
}

function claimBrainrot(id) {
  const brainrot = brainrots.find((item) => item.id === id);
  if (!brainrot) return;
  cashBalance += Math.floor(brainrot.storedCash);
  brainrot.storedCash -= Math.floor(brainrot.storedCash);
  renderFactory();
}

function sellBrainrot(id) {
  const index = brainrots.findIndex((item) => item.id === id);
  if (index < 0) return;
  cashBalance += brainrots[index].sale * SELL_VALUE_MULTIPLIER + Math.floor(brainrots[index].storedCash);
  brainrots.splice(index, 1);
  renderFactory();
}

function sellAllBrainrots() {
  for (const brainrot of brainrots) cashBalance += brainrot.sale * SELL_VALUE_MULTIPLIER + Math.floor(brainrot.storedCash);
  brainrots = [];
  renderFactory();
}

function renderFactory() {
  const grid = document.getElementById("factory-grid");
  if (!grid) return;
  document.getElementById("cash-balance").textContent = `$${Math.floor(cashBalance).toLocaleString()}`;
  document.getElementById("factory-count").textContent = `${brainrots.length}/${factoryCapacity}`;
  document.getElementById("factory-floors").textContent = `${factoryFloors} FLOOR${factoryFloors === 1 ? "" : "S"}`;
  document.getElementById("factory-multiplier").textContent = `${factoryMultiplier.toFixed(2)}x FACTORY`;
  document.getElementById("sell-all").disabled = brainrots.length === 0;
  grid.replaceChildren();
  for (const brainrot of brainrots) {
    const card = document.createElement("article");
    card.className = "brainrot";
    card.style.setProperty("--rarity", brainrot.color);
    const image = document.createElement("img");
    image.src = brainrot.image;
    image.alt = brainrot.name;

    const details = document.createElement("div");
    details.className = "brainrot-details";
    const rarity = document.createElement("strong");
    rarity.className = "brainrot-rarity";
    rarity.textContent = brainrot.rarity;
    const name = document.createElement("input");
    name.className = "brainrot-name";
    name.type = "text";
    name.value = brainrot.name;
    name.maxLength = 40;
    name.dataset.name = brainrot.id;
    name.setAttribute("aria-label", `Name for ${brainrot.rarity} brainrot`);
    const bank = document.createElement("span");
    bank.className = "brainrot-bank";
    bank.dataset.bank = brainrot.id;
    bank.textContent = `$${Math.floor(brainrot.storedCash).toLocaleString()} stored`;
    details.append(rarity, name, bank);

    const actions = document.createElement("div");
    actions.className = "brainrot-actions";
    const imagePicker = document.createElement("label");
    imagePicker.className = "brainrot-image-picker";
    imagePicker.append(document.createTextNode("SET IMAGE"));
    const imageInput = document.createElement("input");
    imageInput.type = "file";
    imageInput.accept = "image/*";
    imageInput.dataset.image = brainrot.id;
    imageInput.setAttribute("aria-label", `Choose an image for ${brainrot.name}`);
    imagePicker.append(imageInput);

    const collect = document.createElement("button");
    collect.dataset.claim = brainrot.id;
    collect.setAttribute("aria-label", `Collect $${Math.floor(brainrot.storedCash)} from ${brainrot.name}`);
    collect.textContent = "COLLECT";
    const sell = document.createElement("button");
    sell.dataset.sell = brainrot.id;
    sell.title = "Sell brainrot";
    sell.textContent = `Sell $${brainrot.sale * SELL_VALUE_MULTIPLIER}`;
    actions.append(imagePicker, collect, sell);
    card.append(image, details, actions);
    grid.append(card);
  }
  renderShop();
}

function renderShop() {
  const list = document.getElementById("upgrade-list");
  if (!list) return;
  document.getElementById("shop-cash").textContent = `$${Math.floor(cashBalance).toLocaleString()}`;
  list.replaceChildren();
  for (const upgrade of upgrades) {
    const purchases = upgrade.purchases || 0;
    const soldOut = upgrade.maxPurchases && purchases >= upgrade.maxPurchases;
    const cost = upgradeCost(upgrade);
    const item = document.createElement("article");
    item.className = "upgrade-row";
    item.innerHTML = `<div><strong>${upgrade.name}</strong><p>${upgrade.description}</p><small>${purchases ? `OWNED ${purchases}${upgrade.maxPurchases ? `/${upgrade.maxPurchases}` : ""}` : "AVAILABLE"}</small></div>`;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.upgrade = upgrade.id;
    button.textContent = soldOut ? "SOLD OUT" : `BUY $${cost.toLocaleString()}`;
    button.disabled = soldOut || cashBalance < cost;
    item.append(button);
    list.append(item);
  }
}

function stealBrainrots() {
  const stolenCount = Math.ceil(brainrots.length * 0.25);
  for (let count = 0; count < stolenCount; count++) {
    if (brainrots.length === 0) break;
    const index = Math.floor(Math.random() * brainrots.length);
    brainrots.splice(index, 1);
  }
  renderFactory();
}

function upgradeCost(upgrade) {
  return Math.floor(upgrade.cost * Math.pow(1.55, upgrade.purchases || 0));
}

function buyUpgrade(id) {
  const upgrade = upgrades.find((item) => item.id === id);
  if (!upgrade || (upgrade.maxPurchases && (upgrade.purchases || 0) >= upgrade.maxPurchases)) return;
  const cost = upgradeCost(upgrade);
  if (cashBalance < cost) return;
  cashBalance -= cost;
  upgrade.purchases = (upgrade.purchases || 0) + 1;
  upgrade.apply();
  renderShop();
  renderFactory();
}

function endGame(reason) {
  gameMode = "gameover";
  gameOverReason = reason;
}

function showTitleScreen() {
  viewMode = "title";
  document.getElementById("shop-backdrop").hidden = true;
  renderMenu();
}

function showSettings() {
  viewMode = "settings";
  document.getElementById("shop-backdrop").hidden = true;
  renderMenu();
}

function beginGame() {
  gameStarted = true;
  viewMode = "game";
  renderMenu();
}

function renderMenu() {
  const overlay = document.getElementById("title-screen");
  if (!overlay) return;
  overlay.hidden = viewMode === "game";
  document.getElementById("title-menu").hidden = viewMode !== "title";
  document.getElementById("settings-menu").hidden = viewMode !== "settings";
  document.getElementById("start-game").textContent = gameStarted ? "RESUME GAME" : "START GAME";
  document.getElementById("title-menu-toggle").hidden = !gameStarted;
  document.getElementById("particle-toggle").checked = particleEffectsEnabled;
  document.getElementById("game-speed").value = String(gameSpeed);
}

const STEP = 1000 / 60;
let lastTime = 0;
let leftover = 0;

function frame(now) {
  const elapsed = Math.min(now - lastTime, 250);
  if (viewMode === "game") {
    leftover += elapsed * gameSpeed * (keys[" "] ? 4 : 1);
  } else {
    leftover = 0;
  }
  lastTime = now;

  while (viewMode === "game" && leftover >= STEP) {
    update();
    leftover = leftover - STEP;
  }

  draw();
  requestAnimationFrame(frame);
}

function start() {
  resetBalls();
  spawnFallingPiece();
  renderShop();
  renderFactory();
  renderMenu();
  lastTime = performance.now();
  requestAnimationFrame(frame);
}

window.addEventListener("load", start, { once: true });
