// ============================================================
// collisions.js: what happens when the ball touches something
//
// To "bounce", we flip the ball's speed:
//   hit something sideways -> vx = -vx
//   hit something above or below -> vy = -vy
// ============================================================

// Returns true if two rectangles (like the ball and a brick) overlap.
function boxesTouch(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

// The ball bounces off the left, right, and top walls.
function bounceOffWalls(ball) {
  if (ball.x < 0) {
    ball.x = 0;
    ball.vx = -ball.vx;
  }
  if (ball.x + ball.width > WIDTH) {
    ball.x = WIDTH - ball.width;
    ball.vx = -ball.vx;
  }
  if (ball.y < 0) {
    ball.y = 0;
    ball.vy = -ball.vy;
  }
}

function bounceOffBottom(ball) {
  if (ball.y + ball.height < HEIGHT || ball.vy <= 0) {
    return;
  }

  ball.state = "held";
  ball.vx = 0;
  ball.vy = 0;
}

function bounceOffPaddle(ball) {
  if (!boxesTouch(ball, paddle) || ball.vy <= 0) return;

  const hitCenter = (ball.x + ball.width / 2) - (paddle.x + paddle.width / 2);
  const maxHorizontal = 3.9;
  const speedBoost = 1.55;

  ball.state = "active";
  ball.y = paddle.y - ball.height - 1;

  const horizontalKick = Math.max(-maxHorizontal, Math.min(maxHorizontal, hitCenter / 8));
  ball.vx = horizontalKick + ball.vx * 0.35;
  ball.vy = -Math.abs(ball.vy || BALL_SPEED) * speedBoost;

  const currentSpeed = Math.hypot(ball.vx, ball.vy);
  if (currentSpeed < BALL_SPEED * 1.7) {
    ball.vx *= 1.6;
    ball.vy *= 1.35;
  }

  spawnParticles(
    ball.x + ball.width / 2,
    ball.y + ball.height / 2,
    "#ffff66",
    36,
    {
      speed: 2.8,
      gravity: 0.15,
      image: randomBrainrotParticleSource()
    }
  );

  return;
}

const PULL_RADIUS = BRICK_WIDTH * 4;
const PULL_FORCE = 0.018;

function applyPullForces(ball) {
  for (const brick of bricks) {
    if (brick.effect !== "PULL") continue;

    const ballCenterX = ball.x + ball.width / 2;
    const ballCenterY = ball.y + ball.height / 2;
    const pullCenterX = brick.x + brick.width / 2;
    const pullCenterY = brick.y + brick.height / 2;
    const distanceX = pullCenterX - ballCenterX;
    const distanceY = pullCenterY - ballCenterY;
    const distance = Math.hypot(distanceX, distanceY);
    if (distance === 0 || distance > PULL_RADIUS) continue;

    const strength = PULL_FORCE * (1 - distance / PULL_RADIUS);
    ball.vx += distanceX / distance * strength;
    ball.vy += distanceY / distance * strength;
  }
}

function spawnBrickBrainrotDrop(brick) {
  if (brick.adachiRei) {
    const brainrot = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      rarity: "SECRET RARITY",
      name: "Hatsune miku Plush",
      defaultName: "Hatsune miku Plush",
      color: "#46c7f2",
      income: 500 / BRAINROT_INCOME_EVENT_MULTIPLIER,
      sale: 4500 / SELL_VALUE_MULTIPLIER,
      storedCash: 0,
      image: "Miku.jpg"
    };
    fallingBrainrots.push({
      brainrot,
      x: brick.x + (brick.width - BRICK_WIDTH / 2) / 2,
      y: brick.y + (brick.height - BRICK_WIDTH / 2) / 2,
      width: BRICK_WIDTH / 2,
      height: BRICK_WIDTH / 2,
      velocityY: 0
    });
    return;
  }

  if (brick.brainrotRarity) spawnBrainrotDrop(brick.brainrotRarity, brick);
}

// The ball bounces off blocks and damages the one it hits.
function bounceOffBricks(ball) {
  for (let index = 0; index < bricks.length; index++) {
    const brick = bricks[index];
    if (!boxesTouch(ball, brick)) {
      continue;
    }

    const overlapX = Math.min(ball.x + ball.width, brick.x + brick.width) - Math.max(ball.x, brick.x);
    const overlapY = Math.min(ball.y + ball.height, brick.y + brick.height) - Math.max(ball.y, brick.y);

    if (overlapX < overlapY) {
      ball.vx = -ball.vx;
      if (ball.x < brick.x) {
        ball.x = brick.x - ball.width;
      } else {
        ball.x = brick.x + brick.width;
      }
    } else {
      ball.vy = -ball.vy;
      if (ball.y < ball.y) {
        ball.y = brick.y - ball.height;
      } else {
        ball.y = brick.y + brick.height;
      }
    }

    spawnParticles(
      brick.x + brick.width / 2,
      brick.y + brick.height / 2,
      "#fff45c",
      48,
      {
        speed: 3.4,
        gravity: 0.18,
        image: randomBrainrotParticleSource()
      }
    );

    brick.hitsRemaining -= 1;
    if (brick.hitsRemaining <= 0) {
      spawnParticles(
        brick.x + brick.width / 2,
        brick.y + brick.height / 2,
        "#ff4cae",
        70,
        {
          speed: 4.2,
          gravity: 0.22,
          image: randomBrainrotParticleSource()
        }
      );

      if (brick.effect === "ROW") {
        const rowBricks = bricks.filter((candidate) => candidate.y === brick.y);
        for (const rowBrick of rowBricks) {
          spawnBrickBrainrotDrop(rowBrick);
        }
        addScore(rowBricks.length * 10);
        bricks = bricks.filter((candidate) => candidate.y !== brick.y);
      } else if (brick.effect === "WARP") {
        const rowBricks = bricks.filter((candidate) => candidate.y === brick.y);
        for (const rowBrick of rowBricks) {
          const column = Math.round(rowBrick.x / BRICK_WIDTH);
          const columnSpan = Math.ceil(rowBrick.width / BRICK_WIDTH);
          const nextColumn = column + 1 + columnSpan > BRICK_COLUMNS ? 0 : column + 1;
          rowBrick.x = nextColumn * BRICK_WIDTH;
        }
        addScore(10);
      } else {
        spawnBrickBrainrotDrop(brick);
        addScore(10);
        bricks.splice(index, 1);
      }
      if (brick.effect === "BALL") {
        scheduleExtraBall(ball.x, ball.y, -ball.vx, ball.vy);
      }
      if (brick.effect === "FRENZY") frenzyTicksRemaining = FRENZY_DURATION_TICKS;
    }
    break;
  }
}