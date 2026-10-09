<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import ControlPanel from './components/ControlPanel.vue'
import ViewerCanvas from './components/ViewerCanvas.vue'
import type { GaussianLoadProgress } from './loaders/loadGaussianFile'
import type {
  GaussianEditorMode,
  GaussianEditorState,
  GaussianAppearanceState,
  GaussianLoadStatus,
  LightPositionState,
  MeshLoadStatus,
  MeshRenderMode,
} from './types/viewer'
import {
  DEFAULT_GAUSSIAN_APPEARANCE,
  DEFAULT_GAUSSIAN_EDITOR_STATE,
  DEFAULT_LIGHT_POSITION,
} from './types/viewer'
const viewerCanvas = useTemplateRef('viewerCanvas')

const meshStatus = ref<MeshLoadStatus>({
  state: 'idle',
  fileName: null,
  message: 'No mesh loaded.',
})

const gaussianStatus = ref<GaussianLoadStatus>({
  state: 'idle',
  fileName: null,
  message: 'No Gaussian scene loaded.',
  loadedBytes: 0,
  totalBytes: 0,
  fraction: null,
  elapsedMilliseconds: 0,
  estimatedRemainingMilliseconds: null,
  splatCount: null,
})

const gaussianEditorState = ref<GaussianEditorState>({
  ...DEFAULT_GAUSSIAN_EDITOR_STATE,
})

const gaussianAppearance = ref<GaussianAppearanceState>({
  ...DEFAULT_GAUSSIAN_APPEARANCE,
})

const lightPosition = ref<LightPositionState>({
  ...DEFAULT_LIGHT_POSITION,
})

let gaussianUiRequestId = 0

const renderMode = ref<MeshRenderMode>('shaded')

function handleResetCamera(): void {
  viewerCanvas.value?.resetCamera()
}

async function handleMeshSelected(file: File): Promise<void> {
  const viewer = viewerCanvas.value
  if (!viewer) {
    meshStatus.value = {
      state: 'error',
      fileName: file.name,
      message: 'The 3D viewer is not ready.',
    }
    return
  }

  meshStatus.value = {
    state: 'loading',
    fileName: file.name,
    message: 'Loading mesh...',
  }

  gaussianStatus.value = {
    state: 'idle',
    fileName: null,
    message: 'No Gaussian scene loaded.',
    loadedBytes: 0,
    totalBytes: 0,
    fraction: null,
    elapsedMilliseconds: 0,
    estimatedRemainingMilliseconds: null,
    splatCount: null,
  }

  try {
    await viewer.loadMesh(file)
    renderMode.value = 'shaded'

    meshStatus.value = {
      state: 'ready',
      fileName: file.name,
      message: 'Mesh loaded successfully.',
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'An unknown mesh-loading error occurred.'

    meshStatus.value = {
      state: 'error',
      fileName: file.name,
      message,
    }

    console.error(`Failed to load mesh: ${file.name}`, error)
  }
}

function handleRenderModeChange(mode: MeshRenderMode): void {
  viewerCanvas.value?.setRenderMode(mode)
  renderMode.value = mode
}

function handleGaussianEditorStateChange(
  state: GaussianEditorState,
): void {
  gaussianEditorState.value = state
}

function handleGaussianEditorModeChange(
  mode: GaussianEditorMode,
): void {
  viewerCanvas.value?.setGaussianEditorMode(mode)
}

function handleGaussianSelectionRadiusChange(radius: number): void {
  viewerCanvas.value?.setGaussianSelectionRadius(radius)
}

function handleClearGaussianSelection(): void {
  viewerCanvas.value?.clearGaussianSelection()
}

function handleDeleteGaussianSelection(): void {
  viewerCanvas.value?.deleteGaussianSelection()
}

function handleUndoGaussianDeletion(): void {
  viewerCanvas.value?.undoGaussianDeletion()
}

function handleRestoreAllGaussians(): void {
  viewerCanvas.value?.restoreAllGaussians()
}

function handleGaussianSizeChange(size: number): void {
  gaussianAppearance.value.size = size
  viewerCanvas.value?.setGaussianSize(size)
}

function handleGaussianOpacityChange(opacity: number): void {
  gaussianAppearance.value.opacity = opacity
  viewerCanvas.value?.setGaussianOpacity(opacity)
}

function handleResetGaussianAppearance(): void {
  gaussianAppearance.value = {
    ...DEFAULT_GAUSSIAN_APPEARANCE,
  }
  viewerCanvas.value?.resetGaussianAppearance()
}

function handleLightPositionChange(position: LightPositionState): void {
  lightPosition.value = position
  viewerCanvas.value?.setLightPosition(position)
}

function handleResetLightPosition(): void {
  lightPosition.value = {
    ...DEFAULT_LIGHT_POSITION,
  }
  viewerCanvas.value?.resetLightPosition()
}

async function handleGaussianSelected(file: File): Promise<void> {
  const viewer = viewerCanvas.value
  const requestId = ++gaussianUiRequestId
  const startedAt = performance.now()

  if (!viewer) {
    gaussianStatus.value = {
      state: 'error',
      fileName: file.name,
      message: 'The 3D viewer is not ready.',
      loadedBytes: 0,
      totalBytes: file.size,
      fraction: null,
      elapsedMilliseconds: 0,
      estimatedRemainingMilliseconds: null,
      splatCount: null,
    }
    return
  }

  gaussianStatus.value = {
    state: 'loading',
    fileName: file.name,
    message: 'Reading and initializing Gaussians...',
    loadedBytes: 0,
    totalBytes: file.size,
    fraction: 0,
    elapsedMilliseconds: 0,
    estimatedRemainingMilliseconds: null,
    splatCount: null,
  }

  meshStatus.value = {
    state: 'idle',
    fileName: null,
    message: 'No mesh loaded.',
  }

  renderMode.value = 'shaded'
  gaussianAppearance.value = {
    ...DEFAULT_GAUSSIAN_APPEARANCE,
  }

  try {
    const summary = await viewer.loadGaussian(
      file,
      (progress: GaussianLoadProgress) => {
        if (requestId !== gaussianUiRequestId) {
          return
        }

        const elapsedMilliseconds =
          performance.now() - startedAt

        const estimatedRemainingMilliseconds =
          progress.fraction > 0 && progress.fraction < 1
            ? elapsedMilliseconds *
              ((1 - progress.fraction) / progress.fraction)
            : progress.fraction >= 1
              ? 0
              : null

        gaussianStatus.value = {
          state: 'loading',
          fileName: file.name,
          message: 'Reading and initializing Gaussians...',
          loadedBytes: progress.loadedBytes,
          totalBytes: progress.totalBytes,
          fraction: progress.fraction,
          elapsedMilliseconds,
          estimatedRemainingMilliseconds,
          splatCount: null,
        }
      },
    )

    if (requestId !== gaussianUiRequestId) {
      return
    }

    const elapsedMilliseconds =
      performance.now() - startedAt

    gaussianStatus.value = {
      state: 'ready',
      fileName: file.name,
      message: 'Gaussian scene loaded successfully.',
      loadedBytes: file.size,
      totalBytes: file.size,
      fraction: 1,
      elapsedMilliseconds,
      estimatedRemainingMilliseconds: 0,
      splatCount: summary.splatCount,
    }
  } catch (error) {
    if (requestId !== gaussianUiRequestId) {
      return
    }

    const message =
      error instanceof Error
        ? error.message
        : 'An unknown Gaussian-loading error occurred.'

    gaussianStatus.value = {
      ...gaussianStatus.value,
      state: 'error',
      fileName: file.name,
      message,
      elapsedMilliseconds: performance.now() - startedAt,
      estimatedRemainingMilliseconds: null,
      splatCount: null,
    }

    console.error(
      `Failed to load Gaussian scene: ${file.name}`,
      error,
    )
  }
}
</script>

<template>
  <main class="app-shell">
    <ViewerCanvas
      ref="viewerCanvas"
      @gaussian-editor-state-change="handleGaussianEditorStateChange"
    />
    <ControlPanel
      :mesh-status="meshStatus"
      :gaussian-status="gaussianStatus"
      :gaussian-editor-state="gaussianEditorState"
      :gaussian-appearance="gaussianAppearance"
      :light-position="lightPosition"
      :render-mode="renderMode"
      @reset-camera="handleResetCamera"
      @mesh-selected="handleMeshSelected"
      @gaussian-selected="handleGaussianSelected"
      @render-mode-change="handleRenderModeChange"
      @gaussian-editor-mode-change="handleGaussianEditorModeChange"
      @gaussian-selection-radius-change="handleGaussianSelectionRadiusChange"
      @clear-gaussian-selection="handleClearGaussianSelection"
      @delete-gaussian-selection="handleDeleteGaussianSelection"
      @undo-gaussian-deletion="handleUndoGaussianDeletion"
      @restore-all-gaussians="handleRestoreAllGaussians"
      @gaussian-size-change="handleGaussianSizeChange"
      @gaussian-opacity-change="handleGaussianOpacityChange"
      @reset-gaussian-appearance="handleResetGaussianAppearance"
      @light-position-change="handleLightPositionChange"
      @reset-light-position="handleResetLightPosition"
    />
  </main>
</template>
