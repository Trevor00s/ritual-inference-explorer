/* eslint-disable */
// Procedural inverse-kinematics creature (lizard) that walks toward a target.
// Faithful port of the classic IK "Reptile" cursor-follower, adapted to:
//  - draw with a passed-in canvas + closure ctx (no globals)
//  - track a { x, y } mouse object instead of a global Input
//  - DPR scaling + ResizeObserver + clean teardown
// Returns a stop() function.

export function startCritter(canvas, mouse, opts = {}) {
  const { color = "#19D184", hunt = null, logo = null } = opts;
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};

  let W = 0;
  let H = 0;
  function resize() {
    const parent = canvas.parentElement;
    const w = parent ? parent.clientWidth : window.innerWidth;
    const h = parent ? parent.clientHeight : window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = w;
    H = h;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  const ro = new ResizeObserver(resize);
  if (canvas.parentElement) ro.observe(canvas.parentElement);

  class Segment {
    constructor(parent, size, angle, range, stiffness) {
      this.isSegment = true;
      this.parent = parent;
      if (typeof parent.children == "object") parent.children.push(this);
      this.children = [];
      this.size = size;
      this.relAngle = angle;
      this.defAngle = angle;
      this.absAngle = parent.absAngle + angle;
      this.range = range;
      this.stiffness = stiffness;
      this.updateRelative(false, true);
    }
    updateRelative(iter, flex) {
      this.relAngle =
        this.relAngle -
        2 * Math.PI * Math.floor((this.relAngle - this.defAngle) / 2 / Math.PI + 1 / 2);
      if (flex) {
        this.relAngle = Math.min(
          this.defAngle + this.range / 2,
          Math.max(
            this.defAngle - this.range / 2,
            (this.relAngle - this.defAngle) / this.stiffness + this.defAngle,
          ),
        );
      }
      this.absAngle = this.parent.absAngle + this.relAngle;
      this.x = this.parent.x + Math.cos(this.absAngle) * this.size;
      this.y = this.parent.y + Math.sin(this.absAngle) * this.size;
      if (iter) for (var i = 0; i < this.children.length; i++) this.children[i].updateRelative(iter, flex);
    }
    draw(iter) {
      ctx.beginPath();
      ctx.moveTo(this.parent.x, this.parent.y);
      ctx.lineTo(this.x, this.y);
      ctx.stroke();
      if (iter) for (var i = 0; i < this.children.length; i++) this.children[i].draw(true);
    }
    follow(iter) {
      var x = this.parent.x;
      var y = this.parent.y;
      var dist = ((this.x - x) ** 2 + (this.y - y) ** 2) ** 0.5;
      this.x = x + (this.size * (this.x - x)) / dist;
      this.y = y + (this.size * (this.y - y)) / dist;
      this.absAngle = Math.atan2(this.y - y, this.x - x);
      this.relAngle = this.absAngle - this.parent.absAngle;
      this.updateRelative(false, true);
      if (iter) for (var i = 0; i < this.children.length; i++) this.children[i].follow(true);
    }
  }

  class LimbSystem {
    constructor(end, length, speed, creature) {
      this.end = end;
      this.length = Math.max(1, length);
      this.creature = creature;
      this.speed = speed;
      creature.systems.push(this);
      this.nodes = [];
      var node = end;
      for (var i = 0; i < length; i++) {
        this.nodes.unshift(node);
        node = node.parent;
        if (!node.isSegment) {
          this.length = i + 1;
          break;
        }
      }
      this.hip = this.nodes[0].parent;
    }
    moveTo(x, y) {
      this.nodes[0].updateRelative(true, true);
      var dist = ((x - this.end.x) ** 2 + (y - this.end.y) ** 2) ** 0.5;
      var len = Math.max(0, dist - this.speed);
      for (var i = this.nodes.length - 1; i >= 0; i--) {
        var node = this.nodes[i];
        var ang = Math.atan2(node.y - y, node.x - x);
        node.x = x + len * Math.cos(ang);
        node.y = y + len * Math.sin(ang);
        x = node.x;
        y = node.y;
        len = node.size;
      }
      for (var i = 0; i < this.nodes.length; i++) {
        var node = this.nodes[i];
        node.absAngle = Math.atan2(node.y - node.parent.y, node.x - node.parent.x);
        node.relAngle = node.absAngle - node.parent.absAngle;
        for (var ii = 0; ii < node.children.length; ii++) {
          var childNode = node.children[ii];
          if (!this.nodes.includes(childNode)) childNode.updateRelative(true, false);
        }
      }
    }
    update() {
      this.moveTo(mouse.x, mouse.y);
    }
  }

  class LegSystem extends LimbSystem {
    constructor(end, length, speed, creature) {
      super(end, length, speed, creature);
      this.goalX = end.x;
      this.goalY = end.y;
      this.step = 0;
      this.forwardness = 0;
      this.reach = 0.9 * ((this.end.x - this.hip.x) ** 2 + (this.end.y - this.hip.y) ** 2) ** 0.5;
      var relAngle =
        this.creature.absAngle - Math.atan2(this.end.y - this.hip.y, this.end.x - this.hip.x);
      relAngle -= 2 * Math.PI * Math.floor(relAngle / 2 / Math.PI + 1 / 2);
      this.swing = -relAngle + ((2 * (relAngle < 0) - 1) * Math.PI) / 2;
      this.swingOffset = this.creature.absAngle - this.hip.absAngle;
    }
    update() {
      this.moveTo(this.goalX, this.goalY);
      if (this.step == 0) {
        var dist = ((this.end.x - this.goalX) ** 2 + (this.end.y - this.goalY) ** 2) ** 0.5;
        if (dist > 1) {
          this.step = 1;
          this.goalX =
            this.hip.x +
            this.reach * Math.cos(this.swing + this.hip.absAngle + this.swingOffset) +
            ((2 * Math.random() - 1) * this.reach) / 2;
          this.goalY =
            this.hip.y +
            this.reach * Math.sin(this.swing + this.hip.absAngle + this.swingOffset) +
            ((2 * Math.random() - 1) * this.reach) / 2;
        }
      } else if (this.step == 1) {
        var theta =
          Math.atan2(this.end.y - this.hip.y, this.end.x - this.hip.x) - this.hip.absAngle;
        var dist = ((this.end.x - this.hip.x) ** 2 + (this.end.y - this.hip.y) ** 2) ** 0.5;
        var forwardness2 = dist * Math.cos(theta);
        var dF = this.forwardness - forwardness2;
        this.forwardness = forwardness2;
        if (dF * dF < 1) {
          this.step = 0;
          this.goalX = this.hip.x + (this.end.x - this.hip.x);
          this.goalY = this.hip.y + (this.end.y - this.hip.y);
        }
      }
    }
  }

  class Creature {
    constructor(x, y, angle, fAccel, fFric, fRes, fThresh, rAccel, rFric, rRes, rThresh) {
      this.x = x;
      this.y = y;
      this.absAngle = angle;
      this.fSpeed = 0;
      this.fAccel = fAccel;
      this.fFric = fFric;
      this.fRes = fRes;
      this.fThresh = fThresh;
      this.rSpeed = 0;
      this.rAccel = rAccel;
      this.rFric = rFric;
      this.rRes = rRes;
      this.rThresh = rThresh;
      this.children = [];
      this.systems = [];
    }
    follow(x, y) {
      var dist = ((this.x - x) ** 2 + (this.y - y) ** 2) ** 0.5;
      var angle = Math.atan2(y - this.y, x - this.x);
      var accel = this.fAccel;
      if (this.systems.length > 0) {
        var sum = 0;
        for (var i = 0; i < this.systems.length; i++) sum += this.systems[i].step == 0;
        accel *= 0.45 + 0.55 * (sum / this.systems.length); // keep ≥45% push — never fully stall
      }
      this.fSpeed += accel * (dist > this.fThresh);
      this.fSpeed *= 1 - this.fRes;
      this.speed = Math.max(0, this.fSpeed - this.fFric);
      var dif = this.absAngle - angle;
      dif -= 2 * Math.PI * Math.floor(dif / (2 * Math.PI) + 1 / 2);
      if (Math.abs(dif) > this.rThresh && dist > this.fThresh) {
        this.rSpeed -= this.rAccel * (2 * (dif > 0) - 1);
      }
      this.rSpeed *= 1 - this.rRes;
      if (Math.abs(this.rSpeed) > this.rFric) this.rSpeed -= this.rFric * (2 * (this.rSpeed > 0) - 1);
      else this.rSpeed = 0;
      this.absAngle += this.rSpeed;
      this.absAngle -= 2 * Math.PI * Math.floor(this.absAngle / (2 * Math.PI) + 1 / 2);
      this.x += this.speed * Math.cos(this.absAngle);
      this.y += this.speed * Math.sin(this.absAngle);
      this.absAngle += Math.PI;
      for (var i = 0; i < this.children.length; i++) this.children[i].follow(true, true);
      for (var i = 0; i < this.systems.length; i++) this.systems[i].update(x, y);
      this.absAngle -= Math.PI;
      this.draw(true);
    }
    draw(iter) {
      var r = 4;
      ctx.beginPath();
      ctx.arc(this.x, this.y, r, Math.PI / 4 + this.absAngle, (7 * Math.PI) / 4 + this.absAngle);
      ctx.moveTo(
        this.x + r * Math.cos((7 * Math.PI) / 4 + this.absAngle),
        this.y + r * Math.sin((7 * Math.PI) / 4 + this.absAngle),
      );
      ctx.lineTo(this.x + r * Math.cos(this.absAngle) * 2 ** 0.5, this.y + r * Math.sin(this.absAngle) * 2 ** 0.5);
      ctx.lineTo(this.x + r * Math.cos(Math.PI / 4 + this.absAngle), this.y + r * Math.sin(Math.PI / 4 + this.absAngle));
      ctx.stroke();
      if (iter) for (var i = 0; i < this.children.length; i++) this.children[i].draw(true);
    }
  }

  function setupLizard(size, legs, tail) {
    var s = size;
    var critter = new Creature(W / 2, H / 2, 0, s * 10, s * 2, 0.5, 6, 0.5, 0.085, 0.5, 0.3);
    var spinal = critter;
    // Neck (shortened)
    for (var i = 0; i < 2; i++) {
      spinal = new Segment(spinal, s * 4, 0, (3.1415 * 2) / 3, 1.1);
      for (var ii = -1; ii <= 1; ii += 2) {
        var node = new Segment(spinal, s * 3, ii, 0.1, 2);
        for (var iii = 0; iii < 3; iii++) node = new Segment(node, s * 0.1, -ii * 0.1, 0.1, 2);
      }
    }
    // Torso and legs
    for (var i = 0; i < legs; i++) {
      if (i > 0) {
        for (var ii = 0; ii < 6; ii++) {
          spinal = new Segment(spinal, s * 4, 0, 1.571, 1.5);
          for (var iii = -1; iii <= 1; iii += 2) {
            var node = new Segment(spinal, s * 3, iii * 1.571, 0.1, 1.5);
            for (var iv = 0; iv < 3; iv++) node = new Segment(node, s * 3, -iii * 0.3, 0.1, 2);
          }
        }
      }
      for (var ii = -1; ii <= 1; ii += 2) {
        var node = new Segment(spinal, s * 12, ii * 0.785, 0, 8);
        node = new Segment(node, s * 16, -ii * 0.785, 6.28, 1);
        node = new Segment(node, s * 16, ii * 1.571, 3.1415, 2);
        for (var iii = 0; iii < 4; iii++) new Segment(node, s * 4, (iii / 3 - 0.5) * 1.571, 0.1, 4);
        new LegSystem(node, 3, s * 12, critter);
      }
    }
    // Tail
    for (var i = 0; i < tail; i++) {
      spinal = new Segment(spinal, s * 4, 0, (3.1415 * 2) / 3, 1.1);
      for (var ii = -1; ii <= 1; ii += 2) {
        var node = new Segment(spinal, s * 3, ii, 0.1, 2);
        for (var iii = 0; iii < 3; iii++) node = new Segment(node, (s * 3 * (tail - i)) / tail, -ii * 0.1, 0.1, 2);
      }
    }
    return critter;
  }

  const legNum = 2; // 2 pairs = 4 big, clearly-visible legs (also fewer segments)
  const critter = setupLizard(8 / Math.sqrt(legNum), legNum, 6);

  ctx.lineWidth = 1.3;
  let raf = 0;
  let last = 0;
  function loop(t) {
    raf = requestAnimationFrame(loop);
    if (t - last < 33) return; // ~30fps, matching the reference repo's pace
    last = t;
    ctx.clearRect(0, 0, W, H);

    // an always-moving wander target so the lizard never stops; prey overrides it
    var gx = W / 2 + Math.cos(t / 680) * W * 0.36;
    var gy = H / 2 + Math.sin(t / 450) * H * 0.36;
    if (hunt) {
      var prey = hunt.nearestHuntable(critter.x, critter.y);
      if (prey) {
        gx = prey.x;
        gy = prey.y;
        var dx = critter.x - prey.x;
        var dy = critter.y - prey.y;
        if (dx * dx + dy * dy < 30 * 30) hunt.markEaten(prey.id); // contact → eat
      }
    }

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.shadowBlur = 0; // no per-segment glow (huge perf win); glow stays only on the logo head
    critter.follow(gx, gy);
    // confine the creature to the right-side playground
    critter.x = Math.max(12, Math.min(W - 12, critter.x));
    critter.y = Math.max(12, Math.min(H - 12, critter.y));
    ctx.shadowBlur = 0;

    // Exact Ritual logo as the head (transparent green endless-knot mark), large + glow
    if (logo && logo.complete && logo.naturalWidth) {
      var sz = 50;
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      ctx.drawImage(logo, critter.x - sz / 2, critter.y - sz / 2, sz, sz);
      ctx.restore();
    }
  }
  raf = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
  };
}
