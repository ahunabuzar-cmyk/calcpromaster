/* ============================================================
 * GeometryLab — pure geometry for an interactive figure lab
 * ------------------------------------------------------------
 * No DOM in the pure functions, so they are unit-tested. The page
 * uses them to compute live measurements as the user drags points.
 * ============================================================ */
(function (root) {
  'use strict';

  function dist(p, q) {
    var dx = q.x - p.x, dy = q.y - p.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function round(n, dp) {
    var f = Math.pow(10, dp == null ? 3 : dp);
    return Math.round(n * f) / f;
  }

  function angleDeg(a, b, c) {
    // angle at vertex a, between sides a-b and a-c
    var ab = dist(a, b), ac = dist(a, c), bc = dist(b, c);
    if (ab === 0 || ac === 0) return 0;
    var cos = (ab * ab + ac * ac - bc * bc) / (2 * ab * ac);
    cos = Math.max(-1, Math.min(1, cos));
    return Math.acos(cos) * 180 / Math.PI;
  }

  // Triangle from three points: side lengths, perimeter, area and angles.
  function triangle(p1, p2, p3) {
    var a = dist(p2, p3); // side opposite p1
    var b = dist(p1, p3); // side opposite p2
    var c = dist(p1, p2); // side opposite p3
    var perimeter = a + b + c;
    // area by the shoelace formula
    var area = Math.abs(
      p1.x * (p2.y - p3.y) +
      p2.x * (p3.y - p1.y) +
      p3.x * (p1.y - p2.y)
    ) / 2;
    // Heron check (for tests): area from sides
    var s = perimeter / 2;
    var heron = Math.max(0, s * (s - a) * (s - b) * (s - c));
    return {
      sides: { a: a, b: b, c: c },
      perimeter: perimeter,
      area: area,
      heronArea: Math.sqrt(heron),
      angles: {
        A: angleDeg(p1, p2, p3),
        B: angleDeg(p2, p1, p3),
        C: angleDeg(p3, p1, p2)
      }
    };
  }

  function circle(center, pointOn) {
    var r = dist(center, pointOn);
    return {
      radius: r,
      diameter: r * 2,
      circumference: 2 * Math.PI * r,
      area: Math.PI * r * r
    };
  }

  function rectangle(p1, p2) {
    var w = Math.abs(p2.x - p1.x), h = Math.abs(p2.y - p1.y);
    return {
      width: w, height: h, perimeter: 2 * (w + h), area: w * h,
      diagonal: Math.sqrt(w * w + h * h)
    };
  }

  function polygonArea(points) {
    if (!points || points.length < 3) return 0;
    var sum = 0;
    for (var i = 0; i < points.length; i++) {
      var j = (i + 1) % points.length;
      sum += points[i].x * points[j].y - points[j].x * points[i].y;
    }
    return Math.abs(sum) / 2;
  }

  var GeometryLab = { dist: dist, angleDeg: angleDeg, triangle: triangle, circle: circle, rectangle: rectangle, polygonArea: polygonArea, round: round };

  if (typeof module !== 'undefined' && module.exports) module.exports = GeometryLab;
  if (typeof window !== 'undefined') window.GeometryLab = GeometryLab;
})(typeof window !== 'undefined' ? window : globalThis);
