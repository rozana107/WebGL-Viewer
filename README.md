# WebGL Viewer

WebGL Viewer is a simple browser-based 3D viewer for visualizing 3D Gaussian Splatting scenes and conventional 3D meshes. It provides a focused interface for loading local files, navigating a scene, adjusting the display, and inspecting meshes with several rendering modes.

The project is a viewer and lightweight editor. It does not train Gaussian models or perform Gaussian-to-mesh reconstruction.

## Features

### 3D Gaussian Splatting

- Loads `.ply`, `.splat`, `.ksplat`, and `.spz` Gaussian files.
- Renders trained Gaussian scenes with Spark.
- Adjusts Gaussian size without moving Gaussian centers.
- Adjusts scene-wide Gaussian opacity.
- Selects Gaussians with the mouse and hides unwanted selections.
- Supports clearing a selection, undoing a deletion, and restoring all Gaussians.
- Keeps the original loaded Gaussian file unchanged.

### 3D Meshes

- Loads `.glb`, `.gltf`, and `.obj` mesh files.
- Provides four rendering modes:
  - Shaded
  - Normals
  - Depth
  - Wireframe
- Provides directional-light position controls for mesh shading.

### Scene Controls

- Orbit, pan, and zoom with the mouse.
- Reset the camera to the fitted scene view.
- Pan with the arrow keys.
- Hold `Shift` while using an arrow key for faster movement.
- Automatically frames newly loaded Gaussian or mesh scenes.

Only one asset representation is displayed at a time. Loading a Gaussian scene removes the active mesh from the viewport, and loading a mesh removes the active Gaussian scene.

## Technology

- Vue 3
- TypeScript
- Vite
- Three.js
- Spark

## Getting Started

Install the dependencies:

```powershell
npm install
```

Start the development server:

```powershell
npm run dev
```

Open the local address printed by Vite in a WebGL-capable browser.

Create a production build:

```powershell
npm run build
```

Preview the production build locally:

```powershell
npm run preview
```

## Using the Viewer

1. Select **Load Gaussian** or **Load Mesh**.
2. Choose a supported file from your computer.
3. Use the mouse or arrow keys to navigate the scene.
4. Use the control panel to adjust the available display or editing settings.

Gaussian appearance and editing operations are applied only to the active in-memory scene. They do not overwrite or modify the source file on disk.

## Local Model Files

Large Gaussian datasets and downloaded models are excluded from Git by default. Place local files in `public/models` when needed for development. The small generated `viewer-test.glb` file remains tracked for basic mesh-loading tests.

## Project Scope

Gaussian-to-mesh reconstruction, object segmentation, and model training require separate processing algorithms and are not part of the current viewer. They can be integrated later as external processing workflows become available.
