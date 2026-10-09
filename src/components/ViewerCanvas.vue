<script setup lang="ts">
import { ref } from 'vue'
import { useThreeScene } from '../composables/useThreeScene'
import type { GaussianEditorState } from '../types/viewer'

const viewportElement = ref<HTMLElement | null>(null)
const emit = defineEmits<{
  'gaussian-editor-state-change': [state: GaussianEditorState]
}>()

const {
  resetCamera,
  loadMesh,
  loadGaussian,
  setRenderMode,
  setGaussianEditorMode,
  setGaussianSelectionRadius,
  clearGaussianSelection,
  deleteGaussianSelection,
  undoGaussianDeletion,
  restoreAllGaussians,
  setGaussianSize,
  setGaussianOpacity,
  resetGaussianAppearance,
  setLightPosition,
  resetLightPosition,
} = useThreeScene(viewportElement, (state) => {
  emit('gaussian-editor-state-change', state)
})

defineExpose({
  resetCamera,
  loadMesh,
  loadGaussian,
  setRenderMode,
  setGaussianEditorMode,
  setGaussianSelectionRadius,
  clearGaussianSelection,
  deleteGaussianSelection,
  undoGaussianDeletion,
  restoreAllGaussians,
  setGaussianSize,
  setGaussianOpacity,
  resetGaussianAppearance,
  setLightPosition,
  resetLightPosition,
})
</script>

<template>
  <section
    ref="viewportElement"
    class="viewport"
    aria-label="Interactive 3D viewport"
  />
</template>
