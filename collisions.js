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


// A descending ball is caught and held for the next volley.
function bounceOffPaddle(ball) {
  if (boxesTouch(ball, paddle) && ball.vy > 0) {
    ball.state = "held";
    ball.vx = 0;
    ball.vy = 0;
  }
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
      rarity: "SPECIAL",
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
      continue;  // not touching this brick, check the next one
    }

    // How far has the ball pushed into the brick on each side?
    const overlapX = Math.min(ball.x + ball.width, brick.x + brick.width) - Math.max(ball.x, brick.x);
    const overlapY = Math.min(ball.y + ball.height, brick.y + brick.height) - Math.max(ball.y, brick.y);

    if (overlapX < overlapY) {
      // The ball hit the brick's left or right side.
      ball.vx = -ball.vx;
      if (ball.x < brick.x) {
        ball.x = brick.x - ball.width;     // left of the brick
      } else {
        ball.x = brick.x + brick.width;    // right of the brick
      }
    } else {
      // The ball hit the brick's top or bottom.
      ball.vy = -ball.vy;
      if (ball.y < brick.y) {
        ball.y = brick.y - ball.height;    // above the brick
      } else {
        ball.y = brick.y + brick.height;   // below the brick
      }
    }

    spawnParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, "#fff45c", 5);
    brick.hitsRemaining -= 1;
    if (brick.hitsRemaining <= 0) {
      spawnParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, "#ff4cae", 22);
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

    break;  // bounce off one brick per update, then stop looking
  }
}
