import * as THREE from 'three'
import {
  SplatEdit,
  SplatEditRgbaBlendMode,
  SplatEditSdf,
  SplatEditSdfType,
  type SplatMesh,
} from '@sparkjsdev/spark'
import type {
  GaussianEditorMode,
  GaussianEditorState,
} from '../types/viewer'
import {
  DEFAULT_GAUSSIAN_EDITOR_STATE,
  GAUSSIAN_SELECTION_RADIUS_MAX,
  GAUSSIAN_SELECTION_RADIUS_MIN,
} from '../types/viewer'

interface DeletionBatch {
  regions: SplatEditSdf[]
  indices: Uint32Array
}

export class GaussianEditor {
  private readonly selectionEdit: SplatEdit
  private readonly deletionEdit: SplatEdit
  private readonly centers: Float32Array
  private readonly selectedMask: Uint8Array
  private readonly deletedMask: Uint8Array
  private readonly selectedRegions: SplatEditSdf[] = []
  private readonly deletionHistory: DeletionBatch[] = []
  private readonly mesh: SplatMesh
  private readonly onStateChange: (
    state: GaussianEditorState,
  ) => void

  private mode: GaussianEditorMode = 'view'
  private selectionRadius =
    DEFAULT_GAUSSIAN_EDITOR_STATE.selectionRadius
  private selectedCount = 0
  private deletedCount = 0

  constructor(
    mesh: SplatMesh,
    onStateChange: (state: GaussianEditorState) => void,
  ) {
    this.mesh = mesh
    this.onStateChange = onStateChange
    this.centers = new Float32Array(mesh.numSplats * 3)
    this.selectedMask = new Uint8Array(mesh.numSplats)
    this.deletedMask = new Uint8Array(mesh.numSplats)

    mesh.forEachSplat((index, center) => {
      const offset = index * 3
      this.centers[offset] = center.x
      this.centers[offset + 1] = center.y
      this.centers[offset + 2] = center.z
    })

    this.selectionEdit = new SplatEdit({
      name: 'Selection highlight',
      rgbaBlendMode: SplatEditRgbaBlendMode.SET_RGB,
      softEdge: 0,
    })

    this.deletionEdit = new SplatEdit({
      name: 'Hidden Gaussians',
      rgbaBlendMode: SplatEditRgbaBlendMode.MULTIPLY,
      softEdge: 0,
    })

    mesh.add(this.selectionEdit)
    mesh.add(this.deletionEdit)
    this.emitState()
  }

  getState(): GaussianEditorState {
    return {
      mode: this.mode,
      selectionRadius: this.selectionRadius,
      selectedCount: this.selectedCount,
      deletedCount: this.deletedCount,
      canUndo: this.deletionHistory.length > 0,
    }
  }

  setMode(mode: GaussianEditorMode): void {
    this.mode = mode
    this.emitState()
  }

  setSelectionRadius(radius: number): void {
    this.selectionRadius = THREE.MathUtils.clamp(
      radius,
      GAUSSIAN_SELECTION_RADIUS_MIN,
      GAUSSIAN_SELECTION_RADIUS_MAX,
    )
    this.emitState()
  }

  selectAtWorldPoint(
    worldPoint: THREE.Vector3,
    additive: boolean,
  ): void {
    if (!additive) {
      this.clearSelection(false)
    }

    const localPoint = this.mesh.worldToLocal(worldPoint.clone())
    const region = new SplatEditSdf({
      type: SplatEditSdfType.SPHERE,
      radius: this.selectionRadius,
      color: new THREE.Color(1, 0.16, 0.12),
      opacity: 1,
    })

    region.position.copy(localPoint)
    this.selectionEdit.add(region)
    this.selectedRegions.push(region)

    const radiusSquared = this.selectionRadius ** 2

    for (let index = 0; index < this.selectedMask.length; index += 1) {
      if (this.deletedMask[index] === 1) {
        continue
      }

      const offset = index * 3
      const deltaX = this.centers[offset] - localPoint.x
      const deltaY = this.centers[offset + 1] - localPoint.y
      const deltaZ = this.centers[offset + 2] - localPoint.z
      const distanceSquared =
        deltaX * deltaX +
        deltaY * deltaY +
        deltaZ * deltaZ

      if (
        distanceSquared <= radiusSquared &&
        this.selectedMask[index] === 0
      ) {
        this.selectedMask[index] = 1
        this.selectedCount += 1
      }
    }

    this.emitState()
  }

  clearSelection(emit = true): void {
    this.selectedRegions.forEach((region) => {
      this.selectionEdit.remove(region)
    })
    this.selectedRegions.length = 0
    this.selectedMask.fill(0)
    this.selectedCount = 0

    if (emit) {
      this.emitState()
    }
  }

  deleteSelection(): void {
    if (this.selectedCount === 0) {
      return
    }

    const indices = new Uint32Array(this.selectedCount)
    let writeIndex = 0

    for (let index = 0; index < this.selectedMask.length; index += 1) {
      if (this.selectedMask[index] === 0) {
        continue
      }

      indices[writeIndex] = index
      writeIndex += 1
      this.deletedMask[index] = 1
    }

    const regions = this.selectedRegions.splice(0)

    regions.forEach((region) => {
      this.selectionEdit.remove(region)
      region.color.set(1, 1, 1)
      region.opacity = 0
      this.deletionEdit.add(region)
    })

    this.deletionHistory.push({ regions, indices })
    this.deletedCount += indices.length
    this.selectedMask.fill(0)
    this.selectedCount = 0
    this.emitState()
  }

  undo(): void {
    const batch = this.deletionHistory.pop()

    if (!batch) {
      return
    }

    batch.regions.forEach((region) => {
      this.deletionEdit.remove(region)
    })

    batch.indices.forEach((index) => {
      this.deletedMask[index] = 0
    })

    this.deletedCount -= batch.indices.length
    this.emitState()
  }

  restoreAll(): void {
    this.clearSelection(false)

    this.deletionHistory.forEach((batch) => {
      batch.regions.forEach((region) => {
        this.deletionEdit.remove(region)
      })
    })

    this.deletionHistory.length = 0
    this.deletedMask.fill(0)
    this.deletedCount = 0
    this.emitState()
  }

  dispose(): void {
    this.mesh.remove(this.selectionEdit)
    this.mesh.remove(this.deletionEdit)
    this.selectedRegions.length = 0
    this.deletionHistory.length = 0
  }

  private emitState(): void {
    this.onStateChange(this.getState())
  }
}
