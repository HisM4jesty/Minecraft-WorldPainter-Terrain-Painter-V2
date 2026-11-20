# Minecraft WorldPainter Terrain Painter V2

An advanced procedural terrain painting script developed for **Minecraft WorldPainter**.

This project generates natural-looking terrain textures by analyzing elevation, slope, water proximity, and procedural noise. Version 2 introduces an improved shoreline detection system based on horizontal distance calculations, allowing more natural coastal transitions.

## Features

### 🌊 Advanced Shoreline System
- Distance-based shoreline detection.
- Adjustable shoreline width and height.
- Approximate horizontal distance calculation to the nearest water block.
- Natural and irregular shoreline boundaries using procedural noise.
- Different terrain distribution for flat and steep coastal areas.
- Improved transitions between beaches and surrounding terrain.

### ⛰️ Slope-Based Terrain Generation
- Grass and dirt distribution on flatter terrain.
- Stone and gravel transitions on steeper slopes.
- Automatic rock placement based on slope thresholds.
- Different terrain materials depending on slope intensity.

### 🏔️ Elevation-Based Generation
- Automatic elevation range detection.
- Configurable rock line.
- Optional snow generation based on elevation.
- Slope restrictions for snow placement.

### 🎲 Procedural Noise
- Multi-layered Fractal Brownian Motion (FBM).
- Seed-based terrain variation.
- Natural-looking grass, podzol, and coarse dirt patches.
- Per-block material variation.
- Irregular shoreline boundaries.

### ⚙️ Performance & Processing
- Tile-based terrain processing.
- Buffered height and water-level data.
- Chamfer Distance Transform (3-4 approximation).
- Optional region-based processing.
- Terrain statistics and progress output.

## Parameters

| Parameter | Default | Description |
|---|---:|---|
| `seed` | 1 | Noise generation seed |
| `noiseScale` | 40 | Size of terrain texture patches |
| `rockStart` | 40 | Slope threshold where rock blending begins |
| `rockHard` | 70 | Slope threshold for hard rock |
| `slopeNoise` | 8 | Random variation in slope thresholds |
| `rockLinePct` | 80 | Elevation threshold for bare rock |
| `snowLinePct` | 101 | Snow elevation threshold (101 disables snow) |
| `snowMaxSlope` | 35 | Maximum slope for snow generation |
| `shoreDist` | 6 | Horizontal shoreline width in blocks |
| `shoreHeight` | 5 | Maximum shoreline height above water |
| `regionSize` | 512 | Processing region size (0 = entire map) |
| `regionCenterX` | 0 | Processing region center X |
| `regionCenterY` | 0 | Processing region center Y |

## How It Works

1. Analyzes the terrain elevation range.
2. Reads terrain heights and water levels.
3. Calculates approximate horizontal distance to water using a chamfer distance transform.
4. Calculates terrain slope using neighboring height values.
5. Applies procedural noise to create natural terrain variations.
6. Selects appropriate terrain materials based on slope, elevation, and water proximity.
7. Applies the generated terrain textures to the selected region.

## Installation

1. Download `TerrainPainterV2.js` from this repository.
2. Open your world in WorldPainter.
3. Load the script through the WorldPainter scripting environment.
4. Configure the parameters.
5. Execute the script to generate terrain textures.

**Recommendation:** Always create a backup of your world before running the script.

## Requirements

- Minecraft WorldPainter
- WorldPainter JavaScript scripting environment

## Version

**Version 2.0**

This version introduces an improved distance-based shoreline system, replacing the simpler height-based shoreline detection approach.

