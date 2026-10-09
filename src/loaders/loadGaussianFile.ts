import type { SplatMesh } from '@sparkjsdev/spark'
import { Box3, Vector3 } from 'three'
import {
  GAUSSIAN_FILE_EXTENSIONS,
  type GaussianFileExtension,
} from '../types/viewer'

export interface GaussianLoadProgress {
  loadedBytes: number
  totalBytes: number
  fraction: number
}

export interface LoadedGaussian {
  mesh: SplatMesh
  bounds: Box3
  splatCount: number
}

export type GaussianProgressCallback = (
  progress: GaussianLoadProgress,
) => void

const MAX_CAMERA_BOUND_SAMPLES = 50_000
const CAMERA_BOUND_TRIM_FRACTION = 0.01

export async function loadGaussianFile(
  file: File,
  onProgress?: GaussianProgressCallback,
): Promise<LoadedGaussian> {
  const extension = getFileExtension(file.name)

  if (!isGaussianFileExtension(extension)) {
    throw new Error(`Unsupported Gaussian format: ${file.name}`)
  }

  if (file.size === 0) {
    throw new Error(`The Gaussian file is empty: ${file.name}`)
  }

  let mesh: SplatMesh | null = null

  try {
    const { SplatMesh: SparkSplatMesh } = await import(
      '@sparkjsdev/spark'
    )

    mesh = new SparkSplatMesh({
      stream: file.stream(),
      streamLength: file.size,
      fileName: file.name,
      editable: true,
      raycastable: true,
      onProgress: (event) => {
        const totalBytes =
          event.total > 0 ? event.total : file.size

        const loadedBytes = Math.min(
          Math.max(event.loaded, 0),
          totalBytes,
        )

        const fraction =
          totalBytes > 0 ? loadedBytes / totalBytes : 0

        onProgress?.({
          loadedBytes,
          totalBytes,
          fraction,
        })
      },
    })

    await mesh.initialized

    if (extension === 'ply') {
      mesh.quaternion.set(1, 0, 0, 0)
    }
    
    mesh.updateMatrixWorld(true)
    
    const bounds = computeGaussianCameraBounds(mesh)
    
    const splatCount = mesh.numSplats
    
    onProgress?.({
      loadedBytes: file.size,
      totalBytes: file.size,
      fraction: 1,
    })
    
    return {
      mesh,
      bounds,
      splatCount,
    }
  } catch (error) {
    mesh?.dispose()
    throw error
  }
}

function computeGaussianCameraBounds(mesh: SplatMesh): Box3 {
  const splatCount = mesh.numSplats

  if (splatCount < 20) {
    return mesh
      .getBoundingBox(true)
      .applyMatrix4(mesh.matrixWorld)
  }

  const sampleStride = Math.max(
    1,
    Math.ceil(splatCount / MAX_CAMERA_BOUND_SAMPLES),
  )

  const sampleCapacity = Math.ceil(splatCount / sampleStride)
  const xValues = new Float32Array(sampleCapacity)
  const yValues = new Float32Array(sampleCapacity)
  const zValues = new Float32Array(sampleCapacity)
  const worldCenter = new Vector3()
  let sampleCount = 0

  mesh.forEachSplat((index, center) => {
    if (index % sampleStride !== 0) {
      return
    }

    worldCenter.copy(center).applyMatrix4(mesh.matrixWorld)
    xValues[sampleCount] = worldCenter.x
    yValues[sampleCount] = worldCenter.y
    zValues[sampleCount] = worldCenter.z
    sampleCount += 1
  })

  const sortedX = xValues.subarray(0, sampleCount).sort()
  const sortedY = yValues.subarray(0, sampleCount).sort()
  const sortedZ = zValues.subarray(0, sampleCount).sort()
  const lowerIndex = Math.floor(
    sampleCount * CAMERA_BOUND_TRIM_FRACTION,
  )
  const upperIndex = Math.max(
    lowerIndex,
    sampleCount - lowerIndex - 1,
  )

  return new Box3(
    new Vector3(
      sortedX[lowerIndex],
      sortedY[lowerIndex],
      sortedZ[lowerIndex],
    ),
    new Vector3(
      sortedX[upperIndex],
      sortedY[upperIndex],
      sortedZ[upperIndex],
    ),
  )
}

function getFileExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.')

  if (dotIndex === -1) {
    return ''
  }

  return fileName.slice(dotIndex + 1).toLowerCase()
}

function isGaussianFileExtension(
  value: string,
): value is GaussianFileExtension {
  return GAUSSIAN_FILE_EXTENSIONS.some(
    (extension) => extension === value,
  )
}
