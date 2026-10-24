const enemies = {};

function enemiesSystem(entities) {
  for (const entity of entities) {
    if (!entity.enemies) {
      entity.enemies = { ...enemies };
    }
  }
}
