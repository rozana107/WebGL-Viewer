<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import {
  GAUSSIAN_EDITOR_MODES,
  GAUSSIAN_OPACITY_MAX,
  GAUSSIAN_OPACITY_MIN,
  GAUSSIAN_OPACITY_STEP,
  GAUSSIAN_SELECTION_RADIUS_MAX,
  GAUSSIAN_SELECTION_RADIUS_MIN,
  GAUSSIAN_SELECTION_RADIUS_STEP,
  GAUSSIAN_SIZE_MAX,
  GAUSSIAN_SIZE_MIN,
  GAUSSIAN_SIZE_STEP,
  LIGHT_POSITION_MAX,
  LIGHT_POSITION_MIN,
  LIGHT_POSITION_STEP,
  MESH_RENDER_MODES,
  type GaussianEditorMode,
  type GaussianEditorState,
  type GaussianAppearanceState,
  type GaussianLoadStatus,
  type LightPositionState,
  type MeshLoadStatus,
  type MeshRenderMode,
} from '../types/viewer'

const props = defineProps<{
  meshStatus: MeshLoadStatus
  gaussianStatus: GaussianLoadStatus
  gaussianEditorState: GaussianEditorState
  gaussianAppearance: GaussianAppearanceState
  lightPosition: LightPositionState
  renderMode: MeshRenderMode
}>()

const emit = defineEmits<{
  'reset-camera': []
  'mesh-selected': [file: File]
  'gaussian-selected': [file: File]
  'render-mode-change': [mode: MeshRenderMode]
  'gaussian-editor-mode-change': [mode: GaussianEditorMode]
  'gaussian-selection-radius-change': [radius: number]
  'clear-gaussian-selection': []
  'delete-gaussian-selection': []
  'undo-gaussian-deletion': []
  'restore-all-gaussians': []
  'gaussian-size-change': [size: number]
  'gaussian-opacity-change': [opacity: number]
  'reset-gaussian-appearance': []
  'light-position-change': [position: LightPositionState]
  'reset-light-position': []
}>()

const isAssetLoading = computed(
  () =>
    props.meshStatus.state === 'loading' ||
    props.gaussianStatus.state === 'loading',
)

const meshInput = useTemplateRef<HTMLInputElement>('meshInput')
const gaussianInput = useTemplateRef<HTMLInputElement>('gaussianInput')

function openMeshPicker(): void {
  meshInput.value?.click()
}

function handleMeshSelection(event: Event): void {
  const input = event.currentTarget as HTMLInputElement
  const file = input.files?.[0]

  if (!file) {
    return
  }

  emit('mesh-selected', file)
  input.value = ''
}

function isMeshRenderMode(value: string): value is MeshRenderMode {
  return MESH_RENDER_MODES.some((mode) => mode === value)
}

function handleRenderModeSelection(event: Event): void {
  const select = event.currentTarget as HTMLSelectElement
  const value = select.value

  if (!isMeshRenderMode(value)) {
    return
  }

  emit('render-mode-change', value)
}

function isGaussianEditorMode(
  value: string,
): value is GaussianEditorMode {
  return GAUSSIAN_EDITOR_MODES.some((mode) => mode === value)
}

function selectGaussianEditorMode(value: string): void {
  if (isGaussianEditorMode(value)) {
    emit('gaussian-editor-mode-change', value)
  }
}

function handleSelectionRadiusInput(event: Event): void {
  const input = event.currentTarget as HTMLInputElement
  emit('gaussian-selection-radius-change', input.valueAsNumber)
}

function handleGaussianSizeInput(event: Event): void {
  const input = event.currentTarget as HTMLInputElement
  emit('gaussian-size-change', input.valueAsNumber)
}

function handleGaussianOpacityInput(event: Event): void {
  const input = event.currentTarget as HTMLInputElement
  emit('gaussian-opacity-change', input.valueAsNumber)
}

function handleLightPositionInput(
  axis: keyof LightPositionState,
  event: Event,
): void {
  const input = event.currentTarget as HTMLInputElement

  emit('light-position-change', {
    ...props.lightPosition,
    [axis]: input.valueAsNumber,
  })
}

function openGaussianPicker(): void {
  gaussianInput.value?.click()
}

function handleGaussianSelection(event: Event): void {
  const input = event.currentTarget as HTMLInputElement
  const file = input.files?.[0]

  if (!file) {
    return
  }

  emit('gaussian-selected', file)
  input.value = ''
}

function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB'] as const
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  )

  const value = bytes / 1024 ** unitIndex
  const unit = units[unitIndex] ?? 'GB'

  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${unit}`
}

function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(
    0,
    Math.round(milliseconds / 1000),
  )

  if (totalSeconds < 60) {
    return `${totalSeconds}s`
  }

  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}m ${seconds}s`
}
</script>
<template>
    <aside class="control-panel" aria-label="Viewer controls">
      <header class="panel-header">
        <h1>Gaussian &amp; Mesh Viewer</h1>
      </header>
  
      <section class="control-group">
        <h3>Files</h3>
        <input
          ref="gaussianInput"
          type="file"
          accept=".ply,.splat,.ksplat,.spz"
          hidden
          :disabled="isAssetLoading"
          @change="handleGaussianSelection"
        />

        <button
          class="asset-button gaussian-button"
          type="button"
          :disabled="isAssetLoading"
          @click="openGaussianPicker"
        >
          Load Gaussian
        </button>

        <div
          class="load-status"
          :data-state="gaussianStatus.state"
          role="status"
        >
          <div class="status-heading">
            <span class="status-indicator" aria-hidden="true" />
            <span>{{ gaussianStatus.state }}</span>
          </div>

          <p
            v-if="gaussianStatus.fileName"
            class="status-filename"
            :title="gaussianStatus.fileName"
          >
            {{ gaussianStatus.fileName }}
          </p>

          <progress
            v-if="
              gaussianStatus.state === 'loading' &&
              gaussianStatus.fraction !== null
            "
            class="load-progress"
            :value="gaussianStatus.fraction"
            max="1"
          />

          <p
            v-if="gaussianStatus.state === 'loading'"
            class="status-message"
          >
            {{ formatBytes(gaussianStatus.loadedBytes) }}
            /
            {{ formatBytes(gaussianStatus.totalBytes) }}
          </p>

          <p
            v-if="gaussianStatus.state === 'loading'"
            class="status-message"
          >
            Elapsed:
            {{ formatDuration(gaussianStatus.elapsedMilliseconds) }}
            <template
              v-if="
                gaussianStatus.estimatedRemainingMilliseconds !== null
              "
            >
              · Remaining:
              {{
                formatDuration(
                  gaussianStatus.estimatedRemainingMilliseconds,
                )
              }}
            </template>
          </p>

          <p
            v-if="
              gaussianStatus.state === 'ready' &&
              gaussianStatus.splatCount !== null
            "
            class="status-message"
          >
            {{ gaussianStatus.splatCount.toLocaleString() }}
            Gaussians
          </p>

          <p class="status-message">
            {{ gaussianStatus.message }}
          </p>
        </div>
        <input
          ref="meshInput"
          type="file"
          accept=".glb,.gltf,.obj"
          hidden
          :disabled="isAssetLoading"
          @change="handleMeshSelection"
        />

        <button
          class="asset-button mesh-button"
          type="button"
          :disabled="isAssetLoading"
          @click="openMeshPicker"
        >
          Load Mesh
        </button>
        <div
          class="load-status"
          :data-state="meshStatus.state"
          role="status"
        >
          <div class="status-heading">
            <span class="status-indicator" aria-hidden="true" />
            <span>{{ meshStatus.state }}</span>
          </div>

          <p
            v-if="meshStatus.fileName"
            class="status-filename"
            :title="meshStatus.fileName"
          >
            {{ meshStatus.fileName }}
          </p>

          <p class="status-message">
            {{ meshStatus.message }}
          </p>
        </div>
      </section>
  
      <section class="control-group">
        <h3>Display</h3>
  
        <label>
          Render mode
          <select
            :value="renderMode"
            :disabled="meshStatus.state !== 'ready'"
            @change="handleRenderModeSelection"
          >
            <option value="shaded">Shaded</option>
            <option value="normals">Normals</option>
            <option value="depth">Depth</option>
            <option value="wireframe">Wireframe</option>
          </select>
        </label>
      </section>

      <section
        v-if="gaussianStatus.state === 'ready'"
        class="control-group gaussian-appearance"
      >
        <h3>Gaussian Appearance</h3>

        <label>
          <span class="slider-heading">
            <span>Size</span>
            <output>{{ gaussianAppearance.size.toFixed(2) }}</output>
          </span>
          <input
            type="range"
            :min="GAUSSIAN_SIZE_MIN"
            :max="GAUSSIAN_SIZE_MAX"
            :step="GAUSSIAN_SIZE_STEP"
            :value="gaussianAppearance.size"
            @input="handleGaussianSizeInput"
          />
        </label>

        <label>
          <span class="slider-heading">
            <span>Opacity</span>
            <output>{{ gaussianAppearance.opacity.toFixed(2) }}</output>
          </span>
          <input
            type="range"
            :min="GAUSSIAN_OPACITY_MIN"
            :max="GAUSSIAN_OPACITY_MAX"
            :step="GAUSSIAN_OPACITY_STEP"
            :value="gaussianAppearance.opacity"
            @input="handleGaussianOpacityInput"
          />
        </label>

        <p class="editor-help">
          Display only. The loaded Gaussian file remains unchanged.
        </p>

        <button
          class="secondary-button"
          type="button"
          @click="emit('reset-gaussian-appearance')"
        >
          Reset appearance
        </button>
      </section>

      <section class="control-group lighting-controls">
        <h3>Lighting</h3>

        <label
          v-for="axis in (['x', 'y', 'z'] as const)"
          :key="axis"
        >
          <span class="slider-heading">
            <span>{{ axis.toUpperCase() }} position</span>
            <output>{{ lightPosition[axis].toFixed(1) }}</output>
          </span>
          <input
            type="range"
            :min="LIGHT_POSITION_MIN"
            :max="LIGHT_POSITION_MAX"
            :step="LIGHT_POSITION_STEP"
            :value="lightPosition[axis]"
            @input="handleLightPositionInput(axis, $event)"
          />
        </label>

        <p class="editor-help">
          Directional lighting affects mesh rendering only.
        </p>

        <button
          class="secondary-button"
          type="button"
          @click="emit('reset-light-position')"
        >
          Reset light position
        </button>
      </section>

      <section
        v-if="gaussianStatus.state === 'ready'"
        class="control-group gaussian-editing"
      >
        <h3>Gaussian Editing</h3>

        <div
          class="mode-switch"
          role="group"
          aria-label="Gaussian editor mode"
        >
          <button
            type="button"
            :class="{
              active: gaussianEditorState.mode === 'view',
            }"
            :aria-pressed="gaussianEditorState.mode === 'view'"
            @click="selectGaussianEditorMode('view')"
          >
            View
          </button>
          <button
            type="button"
            :class="{
              active: gaussianEditorState.mode === 'select',
            }"
            :aria-pressed="gaussianEditorState.mode === 'select'"
            @click="selectGaussianEditorMode('select')"
          >
            Select
          </button>
        </div>

        <label>
          Selection radius
          <input
            type="range"
            :min="GAUSSIAN_SELECTION_RADIUS_MIN"
            :max="GAUSSIAN_SELECTION_RADIUS_MAX"
            :step="GAUSSIAN_SELECTION_RADIUS_STEP"
            :value="gaussianEditorState.selectionRadius"
            @input="handleSelectionRadiusInput"
          />
          <output class="radius-value">
            {{ gaussianEditorState.selectionRadius.toFixed(3) }}
          </output>
        </label>

        <p class="editor-help">
          Click to replace the selection. Shift-click to add.
          Press Escape to return to View mode.
        </p>

        <div class="editor-counts">
          <span>
            Selected
            <strong>{{ gaussianEditorState.selectedCount.toLocaleString() }}</strong>
          </span>
          <span>
            Deleted
            <strong>{{ gaussianEditorState.deletedCount.toLocaleString() }}</strong>
          </span>
        </div>

        <div class="editor-actions">
          <button
            class="secondary-button"
            type="button"
            :disabled="gaussianEditorState.selectedCount === 0"
            @click="emit('clear-gaussian-selection')"
          >
            Clear selection
          </button>
          <button
            class="danger-button"
            type="button"
            :disabled="gaussianEditorState.selectedCount === 0"
            @click="emit('delete-gaussian-selection')"
          >
            Delete selected
          </button>
          <button
            class="secondary-button"
            type="button"
            :disabled="!gaussianEditorState.canUndo"
            @click="emit('undo-gaussian-deletion')"
          >
            Undo
          </button>
          <button
            class="secondary-button"
            type="button"
            :disabled="gaussianEditorState.deletedCount === 0"
            @click="emit('restore-all-gaussians')"
          >
            Restore all
          </button>
        </div>
      </section>
  
      <section class="control-group">
        <h3>Camera</h3>
        <button
          class="secondary-button"
          type="button"
          @click="emit('reset-camera')"
        >
          Reset camera
        </button>
      </section>
    </aside>
  </template>
