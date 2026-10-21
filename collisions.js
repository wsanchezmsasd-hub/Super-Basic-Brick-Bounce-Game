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

    brick.hitsRemaining -= 1;
    if (brick.hitsRemaining <= 0) {
      if (Math.random() < Math.min(0.98, GAME_CONFIG.brainrots.dropChance * brainrotDropMultiplier)) createBrainrot();
      if (brick.effect === "ROW") {
        const rowBrickCount = bricks.filter((candidate) => candidate.y === brick.y).length;
        GameState.Score += rowBrickCount * 10;
        bricks = bricks.filter((candidate) => candidate.y !== brick.y);
      } else {
        GameState.Score += 10;
        bricks.splice(index, 1);
      }
      if (brick.effect === "BALL") {
        scheduleExtraBall(ball.x, ball.y, -ball.vx, ball.vy);
      }
    }

    break;  // bounce off one brick per update, then stop looking
  }
}
