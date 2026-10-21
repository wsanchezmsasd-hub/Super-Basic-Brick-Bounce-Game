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
// x and y are the top-left corner. vx and vy are how many pixels
// the ball moves each update (vx = sideways, vy = up/down).
// A positive vy means the ball is moving DOWN the screen.
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
let cashBalance = 0;
let factoryCapacity = 8;
let factoryFloors = 1;
let factoryMultiplier = 1;
let brainrotIncomeMultiplier = 1;
let brainrotDropMultiplier = 1;
let customBrainrotImage = "";
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
    description: "Brainrot income +25% per purchase",
    cost: 55,
    maxPurchases: 10,
    apply() {
      brainrotIncomeMultiplier *= 1.25;
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
  }
];

const brainrotRarities = [
  { name: "Brainrot God", chance: 1 / 256, color: "#ff3c8e", income: 18, sale: 160 },
  { name: "Mythical", chance: 1 / 64, color: "#ff9b32", income: 7, sale: 60 },
  { name: "Legendary", chance: 1 / 32, color: "#ffe14a", income: 3, sale: 25 },
  { name: "Rare", chance: 1 / 10, color: "#46f0dc", income: 1.25, sale: 10 },
  { name: "Uncommon", chance: 1 / 4, color: "#76ed5a", income: 0.55, sale: 4 },
  { name: "Common", chance: 1 / 2, color: "#aeb6c2", income: 0.2, sale: 2 }
];


// ------------------------------------------------------------
// UPDATE: runs 60 times every second. Move things, then check
// what they touched.
// ------------------------------------------------------------
function update() {
  enemiesSystem(enemyEntities);
  movePaddle();
  tickFactory();

  if (gameMode === "gameover") {
    return;
  }

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
  if (gameMode !== "playing" || volleyActive || balls.length === 0) return;
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
  for (const rarity of brainrotRarities) {
    if (Math.random() < rarity.chance) return rarity;
  }
  return brainrotRarities[brainrotRarities.length - 1];
}

function createBrainrot() {
  if (brainrots.length >= factoryCapacity) return;
  const rarity = rollBrainrotRarity();
  brainrots.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    rarity: rarity.name,
    color: rarity.color,
    income: rarity.income,
    sale: rarity.sale,
    storedCash: 0,
    image: customBrainrotImage
  });
  renderFactory();
}

function tickFactory() {
  if (tickFactory.counter === undefined) tickFactory.counter = 0;
  tickFactory.counter += 1;
  if (tickFactory.counter < 60) return;
  tickFactory.counter = 0;
  const multiplier = factoryMultiplier * brainrotIncomeMultiplier;
  for (const brainrot of brainrots) brainrot.storedCash += brainrot.income * multiplier;
  renderFactory();
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
  cashBalance += brainrots[index].sale + Math.floor(brainrots[index].storedCash);
  brainrots.splice(index, 1);
  renderFactory();
}

function sellAllBrainrots() {
  for (const brainrot of brainrots) cashBalance += brainrot.sale + Math.floor(brainrot.storedCash);
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
    const image = brainrot.image
      ? `<img src="${brainrot.image}" alt="${brainrot.rarity} brainrot">`
      : `<span class="brainrot-glyph" aria-hidden="true">${brainrot.rarity === "Brainrot God" ? "★" : brainrot.rarity[0]}</span>`;
    card.innerHTML = `<button class="brainrot-main" data-claim="${brainrot.id}" aria-label="Collect $${Math.floor(brainrot.storedCash)} from ${brainrot.rarity}">${image}<strong>${brainrot.rarity}</strong><span class="brainrot-bank">$${Math.floor(brainrot.storedCash).toLocaleString()} stored</span><span class="collect-label">COLLECT</span></button><div class="brainrot-actions"><button data-sell="${brainrot.id}" title="Sell brainrot">Sell $${brainrot.sale}</button></div>`;
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
    item.innerHTML = `<div><strong>${upgrade.name}</strong><p>${upgrade.description}</p><small>${purchases ? `OWNED ${purchases}${upgrade.maxPurchases ? `/${upgrade.maxPurchases}` : ""}` : "AVAILABLE"}</small></div><button data-upgrade="${upgrade.id}" ${soldOut || cashBalance < cost ? "disabled" : ""}>${soldOut ? "MAX" : `$${cost}`}</button>`;
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


// ------------------------------------------------------------
// THE GAME LOOP
// The browser calls frame() every time it is ready to draw. Updates
// use fixed 60 Hz steps, with held Space feeding the simulation faster.
// ------------------------------------------------------------
const STEP = 1000 / 60;
let lastTime = 0;
let leftover = 0;

function frame(now) {
  const elapsed = Math.min(now - lastTime, 250);
  leftover += elapsed * (keys[" "] ? 4 : 1);
  lastTime = now;

  while (leftover >= STEP) {
    update();
    leftover = leftover - STEP;
  }

  draw();
  requestAnimationFrame(frame);
}

function start() {
  try {
    customBrainrotImage = localStorage.getItem("brickscape-brainrot-image") || "";
  } catch {
    customBrainrotImage = "";
  }
  resetBalls();
  spawnFallingPiece();
  renderShop();
  renderFactory();
  lastTime = performance.now();
  requestAnimationFrame(frame);
}

window.addEventListener("load", start, { once: true });
