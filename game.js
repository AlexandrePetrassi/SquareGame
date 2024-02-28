// Startup

const refreshRate = 1000/60;
const canvasNodeName = "MainCanvas";
const canvasNode = document.getElementById(canvasNodeName);
const canvas = canvasNode.getContext("2d");
const canvasBounds = canvasNode.getBoundingClientRect();

// Components

const drawMethods = {
    drawRect: (entity) => {
        if (!entity.rect) return;

        canvas.fillRect(
            entity.rect.x,
            entity.rect.y,
            entity.rect.w,
            entity.rect.h
        );
    },
    clearRect: (entity) => {
        if (!entity.rect) return;

        canvas.clearRect(
            entity.rect.x,
            entity.rect.y,
            entity.rect.w,
            entity.rect.h
        );
    }
};

function getAngle(entity, platform) {
    const e = entity.effectiveCollider;
    const p = platform.effectiveCollider;
    const angle = Math.abs(p.angle(e.centerX(), e.centerY()));
    const openness = p.openingAngle();
    return (angle > openness) ? -1 : (angle < Math.PI - openness ? 1 : (e.centerY() > p.centerY()) ? 2 : 0);
}

const collisionMethods = {
    platform: (entity, platform) => {
        if (!platform.isPlatform) return;

        const direction = getAngle(entity, platform);

        collisionMethods.friction(entity, platform, direction);
        collisionMethods.deoverlap(entity, platform, direction);
    },
    friction: (entity, platform, direction) => {
        if (!entity.speed) return;

        if (direction & 1) {
            // Horizontal
            entity.speed.x = 0;
            entity.speed.y *= 0.99;
        } else {
            // Vertical
            entity.speed.x *= 0.98;
            entity.speed.y = 0;
        }
    },
    deoverlap: (entity, platform, direction) => {
        const e = entity.effectiveCollider;
        const p = platform.effectiveCollider;
        /*Up   */ if      (direction ===  0) entity.rect.y -= e.y2() - p.y;
        /*Left */ else if (direction === -1) entity.rect.x -= e.x2() - p.x;
        /*Right*/ else if (direction ===  1) entity.rect.x -= e.x - p.x2();
        /*Down */ else                       entity.rect.y -= e.y - p.y2();
    }
};

function Rect(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
}

function Vector2(x, y) {
    this.x = x;
    this.y = y;
}

function Gravity(terminal = 10) {
    this.acceleration = 0.091;
    this.terminal = terminal;
}

function Collider(rect, collider = new Rect(0, 0, 0, 0)) {
    Rect.call(
        this,
        rect.x + collider.x,
        rect.y + collider.y,
        rect.w + collider.w,
        rect.h + collider.h
    );

    this.x2 = () => this.x + this.w;
    this.y2 = () => this.y + this.h;
    this.centerX = () => this.x + (this.w / 2);
    this.centerY = () => this.y + (this.h / 2);
    this.angle = (x, y) => Math.atan2(y - this.centerY(), x - this.centerX());
    this.openingAngle = () => this.openingAngle = () => this.angle(this.x, this.y2());
}

// Systems

const drawSystem = (entity) => {
    if (!entity.draw) return;

    entity.draw(entity);
}

const gravitySystem = (entity) => {
    if (!entity.rect) return;
    if (!entity.gravity) return;
    if (!entity.speed) return;

    entity.speed.y += entity.gravity.acceleration;
    if (entity.speed.y > entity.gravity.terminal) {
        entity.speed.y = entity.gravity.terminal;
    }
}

const movementSystem = (entity) => {
    if (!entity.speed) return;
    if (!entity.rect) return;

    entity.rect.x += entity.speed.x;
    entity.rect.y += entity.speed.y;
}

const collisionCache = [];

const collisionSystem = (entity, index, entities) => {
    if (!entity.collider) return;
    if (!entity.rect) return;

    entity.effectiveCollider = new Collider(entity.rect, entity.collider);

    for (let i = 0; i < index; i++) {
        const other = entities[i];
        if (!other.collider) continue;

        const collisionsLine = collisionCache[i] ||= [];
        const wasAlreadyColliding = collisionsLine[index];
        const hasCollidedNow = isOverlapping(other.effectiveCollider, entity.effectiveCollider);

        if (hasCollidedNow && wasAlreadyColliding) {
            entity.onCollisionStay?.(entity, other);
            other.onCollisionStay?.(other, entity);
            entity.onCollision?.(entity, other);
            other.onCollision?.(other, entity);
        } else if (hasCollidedNow && !wasAlreadyColliding) {
            entity.onCollisionEnter?.(entity, other);
            other.onCollisionEnter?.(other, entity);
            entity.onCollision?.(entity, other);
            other.onCollision?.(other, entity);
        } else if (!hasCollidedNow && wasAlreadyColliding) {
            entity.onCollisionExit?.(entity, other);
            other.onCollisionExit?.(other, entity);
        }

        collisionsLine[index] = hasCollidedNow;
    }
}

function isOverlapping(rect, other) {
    if (rect.x > other.x2()) return false;
    if (rect.y > other.y2()) return false;
    if (other.x > rect.x2()) return false;
    if (other.y > rect.y2()) return false;
    return true;
}

// Entities

const background = {
    rect: new Collider(new Rect(0, 0, canvasNode.width, canvasNode.height)),
    draw: drawMethods.clearRect
}

const user = {
    rect: new Rect(600, 300, 10, 10),
    speed: new Vector2(-4, -7),
    gravity: new Gravity(),
    draw: drawMethods.drawRect,
    collider: new Rect(0, 0, 0, 0),
    onCollision: collisionMethods.platform
}
const user2 = {
    rect: new Rect(600, 0, 10, 10),
    speed: new Vector2(-4, 0),
    gravity: new Gravity(),
    draw: drawMethods.drawRect,
    collider: new Rect(0, 0, 0, 0),
    onCollision: collisionMethods.platform
}
const user3 = {
    rect: new Rect(200, 300, 10, 10),
    speed: new Vector2(4, -7),
    gravity: new Gravity(),
    draw: drawMethods.drawRect,
    collider: new Rect(0, 0, 0, 0),
    onCollision: collisionMethods.platform
}
const user4 = {
    rect: new Rect(200, 0, 10, 10),
    speed: new Vector2(4, 0),
    gravity: new Gravity(),
    draw: drawMethods.drawRect,
    collider: new Rect(0, 0, 0, 0),
    onCollision: collisionMethods.platform
}

const platform = {
    rect: new Collider(new Rect(200, 100, 400, 50)),
    collider: new Rect(0, 0, 0, 0),
    draw: drawMethods.drawRect,
    isPlatform: true
}

const mouse = {
    x: 0,
    y: 0,
    draw: (e) => canvas.fillText("Mouse: (" + e.x + ", " + e.y + ")", 100, 100)
}

canvasNode.addEventListener('mousemove', (evt) => {
    mouse.x = evt.clientX - canvasBounds.left;
    mouse.y = evt.clientY - canvasBounds.top;
}, false);

// Worlds

const world = {
    entities: [
        background,
        user,
        user2,
        user3,
        user4,
        platform,
        mouse
    ],
    systems: [
        drawSystem,
        gravitySystem,
        movementSystem,
        collisionSystem
    ]
};

// Engine

const engine = {
    activeWorlds: [world]
}

const update = (engine) => {
    engine.activeWorlds.forEach( (world) => {
        world.systems.forEach( (system) => {
            world.entities.forEach( (entity, index) => {
                system(entity, index, world.entities);
            });
        });
    });
}

setInterval(() => update(engine), refreshRate);
