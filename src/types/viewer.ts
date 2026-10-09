export const MESH_RENDER_MODES = [
  'shaded',
  'normals',
  'depth',
  'wireframe',
] as const

export type MeshRenderMode = (typeof MESH_RENDER_MODES)[number]
export type AssetLoadState = 'idle' | 'loading' | 'ready' | 'error'

export interface AssetLoadStatus {
  state: AssetLoadState
  fileName: string | null
  message: string
}

export type MeshLoadStatus = AssetLoadStatus
export interface GaussianLoadStatus extends AssetLoadStatus {
  loadedBytes: number
  totalBytes: number
  fraction: number | null
  elapsedMilliseconds: number
  estimatedRemainingMilliseconds: number | null
  splatCount: number | null
}

export const GAUSSIAN_VIEW_MODES = [
  'projected-splats',
  'centers',
  'ellipsoids',
] as const

export type GaussianViewMode =
  (typeof GAUSSIAN_VIEW_MODES)[number]

export const GAUSSIAN_FILE_EXTENSIONS = [
  'ply',
  'splat',
  'ksplat',
  'spz',
] as const
  
export type GaussianFileExtension =
  (typeof GAUSSIAN_FILE_EXTENSIONS)[number]

export const GAUSSIAN_EDITOR_MODES = ['view', 'select'] as const

export type GaussianEditorMode =
  (typeof GAUSSIAN_EDITOR_MODES)[number]

export interface GaussianEditorState {
  mode: GaussianEditorMode
  selectionRadius: number
  selectedCount: number
  deletedCount: number
  canUndo: boolean
}

export const DEFAULT_GAUSSIAN_EDITOR_STATE: GaussianEditorState = {
  mode: 'view',
  selectionRadius: 0.08,
  selectedCount: 0,
  deletedCount: 0,
  canUndo: false,
}

export const GAUSSIAN_SELECTION_RADIUS_MIN = 0.005
export const GAUSSIAN_SELECTION_RADIUS_MAX = 2
export const GAUSSIAN_SELECTION_RADIUS_STEP = 0.005

export interface GaussianAppearanceState {
  size: number
  opacity: number
}

export const DEFAULT_GAUSSIAN_APPEARANCE: GaussianAppearanceState = {
  size: 1,
  opacity: 1,
}

export const GAUSSIAN_SIZE_MIN = 0.05
export const GAUSSIAN_SIZE_MAX = 3
export const GAUSSIAN_SIZE_STEP = 0.05
export const GAUSSIAN_OPACITY_MIN = 0
export const GAUSSIAN_OPACITY_MAX = 1
export const GAUSSIAN_OPACITY_STEP = 0.01

export interface LightPositionState {
  x: number
  y: number
  z: number
}

export const DEFAULT_LIGHT_POSITION: LightPositionState = {
  x: 4,
  y: 6,
  z: 3,
}

export const LIGHT_POSITION_MIN = -10
export const LIGHT_POSITION_MAX = 10
export const LIGHT_POSITION_STEP = 0.1
