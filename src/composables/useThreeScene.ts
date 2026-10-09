import { onBeforeUnmount, onMounted, type Ref } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { loadMeshFile } from '../loaders/loadMeshFile'
import type {
  GaussianEditorMode,
  GaussianEditorState,
  LightPositionState,
  MeshRenderMode,
} from '../types/viewer'
import {
  DEFAULT_GAUSSIAN_EDITOR_STATE,
  DEFAULT_LIGHT_POSITION,
} from '../types/viewer'
import { createDepthMaterial } from '../rendering/createDepthMaterial'
import type { GaussianAppearanceController } from '../rendering/createGaussianAppearance'
import type { GaussianEditor } from '../editing/GaussianEditor'
import type {
  SparkRenderer,
  SplatMesh,
} from '@sparkjsdev/spark'

import {
  loadGaussianFile,
  type GaussianProgressCallback,
} from '../loaders/loadGaussianFile'

const INITIAL_CAMERA_POSITION = new THREE.Vector3(4, 3, 6)
const INITIAL_CONTROL_TARGET = new THREE.Vector3(0, 0.5, 0)

export interface GaussianSceneSummary {
  splatCount: number
}

interface CameraFitOptions {
  padding?: number
  minimumDistanceScale?: number
}

export interface ThreeSceneController {
  resetCamera: () => void
  loadMesh: (file: File) => Promise<void>
  setRenderMode: (mode: MeshRenderMode) => void
  loadGaussian: (
    file: File,
    onProgress?: GaussianProgressCallback,
  ) => Promise<GaussianSceneSummary>
  setGaussianEditorMode: (mode: GaussianEditorMode) => void
  setGaussianSelectionRadius: (radius: number) => void
  clearGaussianSelection: () => void
  deleteGaussianSelection: () => void
  undoGaussianDeletion: () => void
  restoreAllGaussians: () => void
  setGaussianSize: (size: number) => void
  setGaussianOpacity: (opacity: number) => void
  resetGaussianAppearance: () => void
  setLightPosition: (position: LightPositionState) => void
  resetLightPosition: () => void
}

export function useThreeScene(
  container: Ref<HTMLElement | null>,
  onGaussianEditorStateChange?: (
    state: GaussianEditorState,
  ) => void,
): ThreeSceneController {
  const resetCameraPosition = INITIAL_CAMERA_POSITION.clone()
  const resetControlTarget = INITIAL_CONTROL_TARGET.clone()
  const normalMaterial = new THREE.MeshNormalMaterial()
  const depthMaterialController = createDepthMaterial()
  const depthCenterInView = new THREE.Vector3()
  const gaussianRaycaster = new THREE.Raycaster()
  const gaussianPointer = new THREE.Vector2()
  const keyboardPanOffset = new THREE.Vector3()
  const keyboardPanRight = new THREE.Vector3()
  const keyboardPanUp = new THREE.Vector3()

  const wireframeMaterial = new THREE.MeshBasicMaterial({
    color: 0xe8edf3,
    wireframe: true,
  })

  const originalMeshMaterials = new Map<
    THREE.Mesh,
    THREE.Material | THREE.Material[]
  >()
  
  let scene: THREE.Scene | null = null
  let camera: THREE.PerspectiveCamera | null = null
  let renderer: THREE.WebGLRenderer | null = null
  let controls: OrbitControls | null = null
  let resizeObserver: ResizeObserver | null = null
  let animationFrameId: number | null = null
  let testCube: THREE.Mesh<
    THREE.BoxGeometry,
    THREE.MeshStandardMaterial
  > | null = null
  let grid: THREE.GridHelper | null = null
  let directionalLight: THREE.DirectionalLight | null = null
  let currentMesh: THREE.Object3D | null = null
  let activeRenderMode: MeshRenderMode = 'shaded'
  let currentMeshBoundingSphere: THREE.Sphere | null = null
  let currentGaussian: SplatMesh | null = null
  let gaussianEditor: GaussianEditor | null = null
  let gaussianAppearance: GaussianAppearanceController | null = null
  let sparkRenderer: SparkRenderer | null = null
  let sparkRendererPromise: Promise<SparkRenderer> | null = null
  let assetLoadRequestId = 0
  let isDisposed = false

  function initializeScene(): void {
    const host = container.value

    if (!host) {
      return
    }
    isDisposed = false
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0x090c10)

    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)
    camera.position.copy(resetCameraPosition)

    renderer = new THREE.WebGLRenderer({
      antialias: false,
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.domElement.className = 'webgl-canvas'
    host.appendChild(renderer.domElement)
    renderer.domElement.addEventListener(
      'pointerdown',
      handleGaussianPointerDown,
    )
    window.addEventListener('keydown', handleViewerKeyDown)

    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.zoomToCursor = true
    controls.target.copy(resetControlTarget)
    controls.update()

    const ambientLight = new THREE.HemisphereLight(0xffffff, 0x30343b, 2)
    scene.add(ambientLight)

    directionalLight = new THREE.DirectionalLight(0xffffff, 3)
    resetLightPosition()
    scene.add(directionalLight)

    grid = new THREE.GridHelper(10, 10, 0x56616f, 0x2c333d)
    scene.add(grid)

    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const material = new THREE.MeshStandardMaterial({
      color: 0x70b7ff,
      roughness: 0.45,
      metalness: 0.1,
    })

    testCube = new THREE.Mesh(geometry, material)
    testCube.position.y = 0.5
    scene.add(testCube)

    resizeScene()

    resizeObserver = new ResizeObserver(resizeScene)
    resizeObserver.observe(host)

    renderFrame()
  }

  function resizeScene(): void {
    const host = container.value

    if (!host || !camera || !renderer) {
      return
    }

    const width = host.clientWidth
    const height = host.clientHeight

    if (width === 0 || height === 0) {
      return
    }

    camera.aspect = width / height
    camera.updateProjectionMatrix()

    renderer.setSize(width, height, false)
  }

  function resetCamera(): void {
    if (!camera || !controls) {
      return
    }
  
    camera.position.copy(resetCameraPosition)
    controls.target.copy(resetControlTarget)
    controls.update()
  }

  function setLightPosition(position: LightPositionState): void {
    directionalLight?.position.set(
      position.x,
      position.y,
      position.z,
    )
  }

  function resetLightPosition(): void {
    setLightPosition(DEFAULT_LIGHT_POSITION)
  }

  function emitDefaultGaussianEditorState(): void {
    onGaussianEditorStateChange?.({
      ...DEFAULT_GAUSSIAN_EDITOR_STATE,
    })
  }

  function updateGaussianEditorInteraction(): void {
    const selecting =
      gaussianEditor?.getState().mode === 'select'

    if (controls) {
      controls.enabled = !selecting
    }

    renderer?.domElement.classList.toggle(
      'is-selecting-gaussians',
      selecting,
    )
  }

  function setGaussianEditorMode(
    mode: GaussianEditorMode,
  ): void {
    gaussianEditor?.setMode(mode)
    updateGaussianEditorInteraction()
  }

  function setGaussianSelectionRadius(radius: number): void {
    gaussianEditor?.setSelectionRadius(radius)
  }

  function clearGaussianSelection(): void {
    gaussianEditor?.clearSelection()
  }

  function deleteGaussianSelection(): void {
    gaussianEditor?.deleteSelection()
  }

  function undoGaussianDeletion(): void {
    gaussianEditor?.undo()
  }

  function restoreAllGaussians(): void {
    gaussianEditor?.restoreAll()
  }

  function setGaussianSize(size: number): void {
    gaussianAppearance?.setSize(size)
  }

  function setGaussianOpacity(opacity: number): void {
    gaussianAppearance?.setOpacity(opacity)
  }

  function resetGaussianAppearance(): void {
    gaussianAppearance?.reset()
  }

  function disposeGaussianEditor(): void {
    gaussianEditor?.dispose()
    gaussianEditor = null
    updateGaussianEditorInteraction()
    emitDefaultGaussianEditorState()
  }

  function handleGaussianPointerDown(event: PointerEvent): void {
    if (
      event.button !== 0 ||
      !renderer ||
      !camera ||
      !currentGaussian ||
      gaussianEditor?.getState().mode !== 'select'
    ) {
      return
    }

    const bounds = renderer.domElement.getBoundingClientRect()

    gaussianPointer.set(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
    )

    gaussianRaycaster.setFromCamera(gaussianPointer, camera)

    const intersection = gaussianRaycaster.intersectObject(
      currentGaussian,
      false,
    )[0]

    if (!intersection) {
      if (!event.shiftKey) {
        gaussianEditor.clearSelection()
      }
      return
    }

    gaussianEditor.selectAtWorldPoint(
      intersection.point,
      event.shiftKey,
    )
  }

  function panCameraWithArrowKey(event: KeyboardEvent): boolean {
    if (!camera || !controls || !event.key.startsWith('Arrow')) {
      return false
    }

    camera.updateMatrixWorld()
    keyboardPanRight.setFromMatrixColumn(camera.matrixWorld, 0)
    keyboardPanUp.setFromMatrixColumn(camera.matrixWorld, 1)

    const viewDistance = camera.position.distanceTo(controls.target)
    const speedMultiplier = event.shiftKey ? 3 : 1
    const movementDistance = Math.max(viewDistance * 0.03, 0.001) *
      speedMultiplier

    keyboardPanOffset.set(0, 0, 0)

    switch (event.key) {
      case 'ArrowLeft':
        keyboardPanOffset.addScaledVector(
          keyboardPanRight,
          -movementDistance,
        )
        break

      case 'ArrowRight':
        keyboardPanOffset.addScaledVector(
          keyboardPanRight,
          movementDistance,
        )
        break

      case 'ArrowUp':
        keyboardPanOffset.addScaledVector(
          keyboardPanUp,
          movementDistance,
        )
        break

      case 'ArrowDown':
        keyboardPanOffset.addScaledVector(
          keyboardPanUp,
          -movementDistance,
        )
        break

      default:
        return false
    }

    camera.position.add(keyboardPanOffset)
    controls.target.add(keyboardPanOffset)
    controls.update()

    return true
  }

  function handleViewerKeyDown(event: KeyboardEvent): void {
    const target = event.target
    const isFormControl =
      target instanceof HTMLInputElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLTextAreaElement

    if (isFormControl) {
      return
    }

    if (panCameraWithArrowKey(event)) {
      event.preventDefault()
      return
    }

    if (!gaussianEditor) {
      return
    }

    if (event.key === 'Delete') {
      event.preventDefault()
      deleteGaussianSelection()
    } else if (event.key === 'Escape') {
      setGaussianEditorMode('view')
    }
  }

  function fitCameraToObject(object: THREE.Object3D): void {
    currentMeshBoundingSphere = null
  
    const bounds = new THREE.Box3().setFromObject(object)
    const boundingSphere = fitCameraToBounds(bounds)
  
    if (boundingSphere) {
      currentMeshBoundingSphere = boundingSphere
    }
  }
  
  function fitCameraToBounds(
    bounds: THREE.Box3,
    options: CameraFitOptions = {},
  ): THREE.Sphere | null {
    if (!camera || !controls || bounds.isEmpty()) {
      return null
    }
  
    const boundingSphere = bounds.getBoundingSphere(
      new THREE.Sphere(),
    )
  
    if (boundingSphere.radius === 0) {
      return null
    }
  
    const verticalFov = THREE.MathUtils.degToRad(camera.fov)
    const horizontalFov =
      2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect)
    const limitingFov = Math.min(verticalFov, horizontalFov)
  
    const padding = options.padding ?? 1.2
    const minimumDistanceScale =
      options.minimumDistanceScale ?? 0.01
    const distance =
      (boundingSphere.radius / Math.sin(limitingFov / 2)) *
      padding
  
    const viewDirection = camera.position
      .clone()
      .sub(controls.target)
  
    if (viewDirection.lengthSq() === 0) {
      viewDirection.set(1, 0.75, 1)
    }
  
    viewDirection.normalize()
  
    camera.position
      .copy(boundingSphere.center)
      .add(viewDirection.multiplyScalar(distance))
  
    camera.near = Math.max(distance / 1000, 0.0001)
    camera.far = Math.max(distance * 100, 100)
    camera.updateProjectionMatrix()
  
    controls.target.copy(boundingSphere.center)
    controls.minDistance = Math.max(
      boundingSphere.radius * minimumDistanceScale,
      0.0001,
    )
    controls.maxDistance = distance * 10
    controls.update()
  
    resetCameraPosition.copy(camera.position)
    resetControlTarget.copy(controls.target)
  
    return boundingSphere
  }

  function updateDepthRange(): void {
    if (!camera || !currentMeshBoundingSphere) {
      return
    }
  
    camera.updateMatrixWorld()
  
    depthCenterInView
      .copy(currentMeshBoundingSphere.center)
      .applyMatrix4(camera.matrixWorldInverse)
  
    const centerDepth = -depthCenterInView.z
    const nearDepth = Math.max(
      centerDepth - currentMeshBoundingSphere.radius,
      0,
    )
    const farDepth = Math.max(
      centerDepth + currentMeshBoundingSphere.radius,
      nearDepth + 0.000001,
    )
  
    depthMaterialController.setRange(nearDepth, farDepth)
  }

  function renderFrame(): void {
    if (!scene || !camera || !renderer) {
      return
    }

    animationFrameId = window.requestAnimationFrame(renderFrame)

    controls?.update()

    if (activeRenderMode === 'depth') {
      updateDepthRange()
    }

    renderer.render(scene, camera)
  }

  function registerOriginalMaterials(object: THREE.Object3D): void {
    originalMeshMaterials.clear()
  
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        originalMeshMaterials.set(child, child.material)
      }
    })
  }
  
  function restoreOriginalMaterials(): void {
    originalMeshMaterials.forEach((material, mesh) => {
      mesh.material = material
    })
  }
  
  function setRenderMode(mode: MeshRenderMode): void {
    activeRenderMode = mode

    originalMeshMaterials.forEach((originalMaterial, mesh) => {
      switch (mode) {
        case 'shaded':
          mesh.material = originalMaterial
          break

        case 'normals':
          mesh.material = normalMaterial
          break

        case 'depth':
          mesh.material = depthMaterialController.material
          break

        case 'wireframe':
          mesh.material = wireframeMaterial
          break
      }
    })

    if (grid) {
      grid.visible = mode !== 'depth'
    }
  }

  async function loadMesh(file: File): Promise<void> {
    const requestId = ++assetLoadRequestId
    const loadedMesh = await loadMeshFile(file)
  
    if (
      requestId !== assetLoadRequestId ||
      isDisposed ||
      !scene
    ) {
      disposeObjectResources(loadedMesh)
      throw new Error('The mesh load was cancelled.')
    }
  
    if (currentGaussian) {
      disposeGaussianEditor()
      scene.remove(currentGaussian)
      currentGaussian.dispose()
      currentGaussian = null
      gaussianAppearance = null
    }
  
    currentMeshBoundingSphere = null
  
    if (currentMesh) {
      restoreOriginalMaterials()
      scene.remove(currentMesh)
      disposeObjectResources(currentMesh)
      originalMeshMaterials.clear()
    }
  
    if (testCube) {
      scene.remove(testCube)
      disposeObjectResources(testCube)
      testCube = null
    }
  
    currentMesh = loadedMesh
    registerOriginalMaterials(currentMesh)
    setRenderMode('shaded')
  
    scene.add(currentMesh)
    fitCameraToObject(currentMesh)
  }

  async function ensureSparkRenderer(): Promise<SparkRenderer> {
    if (sparkRenderer) {
      return sparkRenderer
    }
  
    if (sparkRendererPromise) {
      return sparkRendererPromise
    }
  
    if (!renderer || !scene || isDisposed) {
      throw new Error('The Three.js scene is not available.')
    }
  
    const activeRenderer = renderer
    const activeScene = scene
  
    sparkRendererPromise = (async () => {
      const { SparkRenderer: SparkRendererClass } = await import(
        '@sparkjsdev/spark'
      )
  
      if (
        isDisposed ||
        renderer !== activeRenderer ||
        scene !== activeScene
      ) {
        throw new Error(
          'The viewer closed while Spark was initializing.',
        )
      }
  
      const createdRenderer = new SparkRendererClass({
        renderer: activeRenderer,
      })
  
      activeScene.add(createdRenderer)
      sparkRenderer = createdRenderer
  
      return createdRenderer
    })()
  
    try {
      return await sparkRendererPromise
    } finally {
      sparkRendererPromise = null
    }
  }

  async function loadGaussian(
    file: File,
    onProgress?: GaussianProgressCallback,
  ): Promise<GaussianSceneSummary> {
    const requestId = ++assetLoadRequestId
  
    await ensureSparkRenderer()

    const [
      { GaussianEditor: GaussianEditorClass },
      { createGaussianAppearance },
    ] = await Promise.all([
      import('../editing/GaussianEditor'),
      import('../rendering/createGaussianAppearance'),
    ])
  
    if (requestId !== assetLoadRequestId || isDisposed) {
      throw new Error('The Gaussian load was cancelled.')
    }
  
    const loadedGaussian = await loadGaussianFile(
      file,
      onProgress,
    )
  
    if (
      requestId !== assetLoadRequestId ||
      isDisposed ||
      !scene
    ) {
      loadedGaussian.mesh.dispose()
      throw new Error('The Gaussian load was cancelled.')
    }
  
    if (currentMesh) {
      restoreOriginalMaterials()
      scene.remove(currentMesh)
      disposeObjectResources(currentMesh)
      originalMeshMaterials.clear()
      currentMesh = null
    }
    
    currentMeshBoundingSphere = null
    setRenderMode('shaded')
    
    const previousGaussian = currentGaussian
    disposeGaussianEditor()
  
    currentGaussian = loadedGaussian.mesh
    currentGaussian.name = file.name
    gaussianAppearance = createGaussianAppearance(currentGaussian)
    scene.add(currentGaussian)
    gaussianEditor = new GaussianEditorClass(
      currentGaussian,
      (state) => onGaussianEditorStateChange?.(state),
    )
    updateGaussianEditorInteraction()
  
    if (testCube) {
      scene.remove(testCube)
      disposeObjectResources(testCube)
      testCube = null
    }
  
    fitCameraToBounds(loadedGaussian.bounds, {
      padding: 0.55,
      minimumDistanceScale: 0.0001,
    })
  
    if (previousGaussian) {
      scene.remove(previousGaussian)
      previousGaussian.dispose()
    }
  
    return {
      splatCount: loadedGaussian.splatCount,
    }
  }

  function disposeObjectResources(object: THREE.Object3D): void {
    const geometries = new Set<THREE.BufferGeometry>()
    const materials = new Set<THREE.Material>()
    const textures = new Set<THREE.Texture>()
  
    object.traverse((child) => {
      const isRenderable =
        child instanceof THREE.Mesh ||
        child instanceof THREE.Line ||
        child instanceof THREE.Points
  
      if (!isRenderable) {
        return
      }
  
      geometries.add(child.geometry)
  
      const childMaterials = Array.isArray(child.material)
        ? child.material
        : [child.material]
  
      childMaterials.forEach((material) => {
        materials.add(material)
  
        Object.values(material).forEach((value) => {
          if (value instanceof THREE.Texture) {
            textures.add(value)
          }
        })
      })
    })
  
    textures.forEach((texture) => texture.dispose())
    materials.forEach((material) => material.dispose())
    geometries.forEach((geometry) => geometry.dispose())
  }

  function disposeScene(): void {
    if (animationFrameId !== null) {
      window.cancelAnimationFrame(animationFrameId)
    }

    isDisposed = true
    assetLoadRequestId += 1
    resizeObserver?.disconnect()
    controls?.dispose()
    renderer?.domElement.removeEventListener(
      'pointerdown',
      handleGaussianPointerDown,
    )
    window.removeEventListener('keydown', handleViewerKeyDown)

    if (currentGaussian) {
      disposeGaussianEditor()
      scene?.remove(currentGaussian)
      currentGaussian.dispose()
      currentGaussian = null
      gaussianAppearance = null
    }
    
    if (sparkRenderer) {
      scene?.remove(sparkRenderer)
      sparkRenderer.dispose()
      sparkRenderer = null
    }

    if (currentMesh) {
      restoreOriginalMaterials()
      scene?.remove(currentMesh)
      disposeObjectResources(currentMesh)
      originalMeshMaterials.clear()
      currentMesh = null
    }

    if (testCube) {
      testCube.geometry.dispose()
      testCube.material.dispose()
    }

    if (grid) {
      grid.geometry.dispose()

      const gridMaterials = Array.isArray(grid.material)
        ? grid.material
        : [grid.material]

      gridMaterials.forEach((material) => material.dispose())
    }


    normalMaterial.dispose()
    wireframeMaterial.dispose()
    depthMaterialController.dispose()
    renderer?.dispose()
    renderer?.domElement.remove()
    scene?.clear()

    scene = null
    camera = null
    renderer = null
    controls = null
    resizeObserver = null
    animationFrameId = null
    testCube = null
    grid = null
    directionalLight = null
    currentMeshBoundingSphere = null
    activeRenderMode = 'shaded'
    sparkRendererPromise = null
    currentGaussian = null
    gaussianAppearance = null
  }

  onMounted(initializeScene)
  onBeforeUnmount(disposeScene)

  return {
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
  }
}

