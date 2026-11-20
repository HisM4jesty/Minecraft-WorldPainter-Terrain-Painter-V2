// script.name=Slope & Height Terrain Painter
// script.description=Paints terrain by slope, height, water proximity and noise
// script.param.seed.type=integer
// script.param.seed.description=Noise seed
// script.param.seed.default=1
// script.param.noiseScale.type=float
// script.param.noiseScale.description=Size of grass/podzol/dirt patches (blocks)
// script.param.noiseScale.default=40
// script.param.rockStart.type=float
// script.param.rockStart.description=Slope percent where rock starts mixing in
// script.param.rockStart.default=40
// script.param.rockHard.type=float
// script.param.rockHard.description=Slope percent where terrain becomes hard bare rock
// script.param.rockHard.default=70
// script.param.slopeNoise.type=float
// script.param.slopeNoise.description=How much noise shifts the slope thresholds (percent points)
// script.param.slopeNoise.default=8
// script.param.rockLinePct.type=float
// script.param.rockLinePct.description=Above this percent of the land height range = bare rock
// script.param.rockLinePct.default=80
// script.param.snowLinePct.type=float
// script.param.snowLinePct.description=Snow above this percent of height range (101 = no snow)
// script.param.snowLinePct.default=101
// script.param.snowMaxSlope.type=float
// script.param.snowMaxSlope.description=Snow only where slope is below this percent
// script.param.snowMaxSlope.default=35
// script.param.shoreDist.type=float
// script.param.shoreDist.description=Shore band width: horizontal distance from water (blocks)
// script.param.shoreDist.default=6
// script.param.shoreHeight.type=float
// script.param.shoreHeight.description=Shore only up to this many blocks above water level
// script.param.shoreHeight.default=5
// script.param.regionSize.type=integer
// script.param.regionSize.description=Test region size in blocks (0 = whole map)
// script.param.regionSize.default=512
// script.param.regionCenterX.type=integer
// script.param.regionCenterX.default=0
// script.param.regionCenterY.type=integer
// script.param.regionCenterY.default=0

function p(name, def) {
    if (typeof params !== 'undefined' && params !== null) {
        var v = params[name];
        if (v !== undefined && v !== null && String(v) !== '') return v;
    }
    return def;
}

var seed        = Number(p('seed', 1));
var noiseScale  = Number(p('noiseScale', 40));
var rockStart   = Number(p('rockStart', 40));
var rockHard    = Number(p('rockHard', 70));
var slopeNoise  = Number(p('slopeNoise', 8));
var rockLinePct = Number(p('rockLinePct', 80));
var snowLinePct = Number(p('snowLinePct', 101));
var snowMaxSlope= Number(p('snowMaxSlope', 35));
var shoreDist   = Number(p('shoreDist', 6));
var shoreHeight = Number(p('shoreHeight', 5));
var regionSize  = Number(p('regionSize', 512));
var regionCX    = Number(p('regionCenterX', 0));
var regionCY    = Number(p('regionCenterY', 0));

// ---------- terrain lookup (tries several enum names) ----------
var Terrain = Java.type('org.pepsoft.worldpainter.Terrain');
function resolve(label, names) {
    for (var i = 0; i < names.length; i++) {
        try { return Terrain.valueOf(names[i]); } catch (e) {}
    }
    throw new Error('Terrain not found for ' + label + ' (tried ' + names.join(', ') + ')');
}
var T = {
    GRASS:     resolve('GRASS', ['GRASS']),
    PODZOL:    resolve('PODZOL', ['PODZOL', 'DIRT']),
    COARSE:    resolve('COARSE', ['COARSE_DIRT', 'PERMADIRT', 'DIRT']),
    DIRT:      resolve('DIRT', ['DIRT']),
    SAND:      resolve('SAND', ['SAND']),
    GRAVEL:    resolve('GRAVEL', ['GRAVEL']),
    CLAY:      resolve('CLAY', ['CLAY', 'GRAVEL']),
    STONE:     resolve('STONE', ['STONE']),
    STONE_MIX: resolve('STONE_MIX', ['STONE_MIX', 'ROCK', 'STONE']),
    ANDESITE:  resolve('ANDESITE', ['ANDESITE', 'STONE']),
    COBBLE:    resolve('COBBLE', ['COBBLESTONE', 'STONE']),
    SNOW:      resolve('SNOW', ['DEEP_SNOW', 'SNOW'])
};

// ---------- noise ----------
function hash(ix, iy, s) {
    var v = Math.sin(ix * 127.1 + iy * 311.7 + s * 74.7) * 43758.5453;
    return v - Math.floor(v);
}
function vnoise(x, y, scale, s) {
    var fx = x / scale, fy = y / scale;
    var ix = Math.floor(fx), iy = Math.floor(fy);
    var tx = fx - ix, ty = fy - iy;
    tx = tx * tx * (3 - 2 * tx);
    ty = ty * ty * (3 - 2 * ty);
    var a = hash(ix, iy, s), b = hash(ix + 1, iy, s);
    var c = hash(ix, iy + 1, s), d = hash(ix + 1, iy + 1, s);
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
}
function fbm(x, y, scale, s) {
    return 0.6 * vnoise(x, y, scale, s) + 0.3 * vnoise(x, y, scale / 2.3, s + 17) + 0.1 * vnoise(x, y, scale / 5, s + 31);
}
function pick(opts, r) {
    var tot = 0, i;
    for (i = 0; i < opts.length; i++) tot += opts[i][1];
    var t = r * tot, acc = 0;
    for (i = 0; i < opts.length; i++) {
        acc += opts[i][1];
        if (t < acc) return opts[i][0];
    }
    return opts[opts.length - 1][0];
}

// ---------- height range of the map (coarse sampling) ----------
var TILE = 128;
var R = Math.ceil(shoreDist) + 4;      // border around each tile (blocks)
var B = TILE + 2 * R;
var tiles = dimension.getTiles().toArray();
var lo = 1e9, hi = -1e9;
for (var s0 = 0; s0 < tiles.length; s0++) {
    var tt = tiles[s0];
    for (var sy = 0; sy < TILE; sy += 16) {
        for (var sx = 0; sx < TILE; sx += 16) {
            var ax = tt.getX() * TILE + sx, ay = tt.getY() * TILE + sy;
            var hh = dimension.getHeightAt(ax, ay);
            if (hh > dimension.getWaterLevelAt(ax, ay)) {
                if (hh < lo) lo = hh;
                if (hh > hi) hi = hh;
            }
        }
    }
}
if (hi <= lo) { lo = 0; hi = 255; }
var range    = hi - lo;
var rockLine = lo + range * rockLinePct / 100;
var snowLine = lo + range * snowLinePct / 100;
print('Land height range: ' + Math.round(lo) + ' - ' + Math.round(hi) +
      ' | rock line: ' + Math.round(rockLine) +
      (snowLinePct <= 100 ? ' | snow line: ' + Math.round(snowLine) : ' | snow: off'));

// ---------- region ----------
var rx1 = -1e9, rx2 = 1e9, ry1 = -1e9, ry2 = 1e9;
if (regionSize > 0) {
    rx1 = regionCX - regionSize / 2; rx2 = regionCX + regionSize / 2;
    ry1 = regionCY - regionSize / 2; ry2 = regionCY + regionSize / 2;
    print('Region: x ' + rx1 + '..' + rx2 + ', y ' + ry1 + '..' + ry2);
}

// ---------- main ----------
var counts = {};
var buf  = new Array(B * B);   // heights
var wbuf = new Array(B * B);   // water levels
var dist = new Array(B * B);   // distance to water (x3, chamfer 3-4)
var painted = 0;
var INF = 1e9;

for (var ti = 0; ti < tiles.length; ti++) {
    if (java.lang.Thread.interrupted()) { print('Interrupted.'); break; }
    var tile = tiles[ti];
    var x0 = tile.getX() * TILE, y0 = tile.getY() * TILE;
    if (x0 + TILE < rx1 || x0 > rx2 || y0 + TILE < ry1 || y0 > ry2) continue;

    // heights, water levels and water mask incl. border
    var j, i, k, d;
    for (j = 0; j < B; j++) {
        for (i = 0; i < B; i++) {
            k = j * B + i;
            var gx0 = x0 + i - R, gy0 = y0 + j - R;
            var hv = dimension.getHeightAt(gx0, gy0);
            buf[k] = hv;
            if (hv > -1e6) {
                var wv = dimension.getWaterLevelAt(gx0, gy0);
                wbuf[k] = wv;
                dist[k] = (wv > hv) ? 0 : INF;
            } else {
                wbuf[k] = -1e9;
                dist[k] = INF;
            }
        }
    }
    // chamfer distance transform (forward + backward pass)
    for (j = 1; j < B; j++) {
        for (i = 1; i < B - 1; i++) {
            k = j * B + i;
            d = dist[k];
            if (dist[k - 1] + 3 < d) d = dist[k - 1] + 3;
            if (dist[k - B] + 3 < d) d = dist[k - B] + 3;
            if (dist[k - B - 1] + 4 < d) d = dist[k - B - 1] + 4;
            if (dist[k - B + 1] + 4 < d) d = dist[k - B + 1] + 4;
            dist[k] = d;
        }
    }
    for (j = B - 2; j >= 0; j--) {
        for (i = B - 2; i >= 1; i--) {
            k = j * B + i;
            d = dist[k];
            if (dist[k + 1] + 3 < d) d = dist[k + 1] + 3;
            if (dist[k + B] + 3 < d) d = dist[k + B] + 3;
            if (dist[k + B + 1] + 4 < d) d = dist[k + B + 1] + 4;
            if (dist[k + B - 1] + 4 < d) d = dist[k + B - 1] + 4;
            dist[k] = d;
        }
    }

    for (var dy = 0; dy < TILE; dy++) {
        for (var dx = 0; dx < TILE; dx++) {
            var x = x0 + dx, y = y0 + dy;
            if (x < rx1 || x >= rx2 || y < ry1 || y >= ry2) continue;

            var idx = (dy + R) * B + (dx + R);
            var c = buf[idx];
            if (!(c > -1e6)) continue;

            var xm = buf[idx - 2], xp = buf[idx + 2], ym = buf[idx - 2 * B], yp = buf[idx + 2 * B];
            if (!(xm > -1e6)) xm = c;
            if (!(xp > -1e6)) xp = c;
            if (!(ym > -1e6)) ym = c;
            if (!(yp > -1e6)) yp = c;
            var gx = (xp - xm) / 4, gy = (yp - ym) / 4;
            var slope = Math.sqrt(gx * gx + gy * gy) * 100;     // percent

            var wl = wbuf[idx];
            var dm = dist[idx] / 3;                              // blocks to nearest water
            var w = hash(x, y, seed + 101);                      // per-block speckle
            var nS = fbm(x, y, noiseScale * 0.5, seed + 1);
            var terrain;

            var lim = shoreDist + (nS - 0.5) * 4;                // wobbly shore edge

            if (wl > c) {
                // ----- underwater -----
                var depth = wl - c;
                if (depth <= 1.5)   terrain = pick([[T.SAND, 60], [T.GRAVEL, 40]], w);
                else if (depth < 5) terrain = pick([[T.GRAVEL, 50], [T.SAND, 30], [T.CLAY, 20]], w);
                else                terrain = pick([[T.GRAVEL, 40], [T.CLAY, 30], [T.DIRT, 30]], w);
            } else if (dm <= lim && (c - wl) <= shoreHeight && (dm < lim * 0.6 || w < 0.5)) {
                // ----- shore (within shoreDist blocks of water) -----
                if (slope < 25) terrain = pick([[T.SAND, 50], [T.GRAVEL, 35], [T.COARSE, 15]], w);
                else            terrain = pick([[T.GRAVEL, 70], [T.STONE_MIX, 30]], w);
            } else {
                // ----- land -----
                var r = slope + (nS - 0.5) * slopeNoise * 2;
                var nH = fbm(x, y, noiseScale * 2, seed + 5);
                var rl = rockLine + (nH - 0.5) * range * 0.08;

                if (snowLinePct <= 100 && c > snowLine + (nH - 0.5) * range * 0.06 && slope < snowMaxSlope) {
                    terrain = T.SNOW;
                } else if (c > rl || r > rockHard) {
                    terrain = pick([[T.STONE, 50], [T.ANDESITE, 25], [T.COBBLE, 15], [T.GRAVEL, 10]], w);
                } else if (r > rockStart) {
                    terrain = pick([[T.STONE_MIX, 35], [T.ANDESITE, 15], [T.GRAVEL, 20], [T.COARSE, 20], [T.STONE, 10]], w);
                } else if (r > rockStart - 10) {
                    terrain = pick([[T.COARSE, 40], [T.GRAVEL, 20], [T.GRASS, 40]], w);
                } else {
                    var nP = fbm(x, y, noiseScale, seed + 3);
                    var nQ = fbm(x, y, noiseScale * 0.5, seed + 9);
                    if (nP > 0.62)      terrain = pick([[T.PODZOL, 75], [T.GRASS, 25]], w);
                    else if (nQ > 0.66) terrain = pick([[T.COARSE, 70], [T.GRASS, 30]], w);
                    else                terrain = T.GRASS;
                }
            }

            dimension.setTerrainAt(x, y, terrain);
            painted++;
            var nm = terrain.name();
            counts[nm] = (counts[nm] || 0) + 1;
        }
    }
    if (ti % 50 === 0) print('Tile ' + ti + ' / ' + tiles.length);
}

print('Painted blocks: ' + painted);
for (var key in counts) print('  ' + key + ': ' + counts[key]);
