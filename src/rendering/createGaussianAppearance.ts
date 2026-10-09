import {
  dyno,
  type GsplatModifier,
  type SplatMesh,
} from '@sparkjsdev/spark'
import {
  DEFAULT_GAUSSIAN_APPEARANCE,
  GAUSSIAN_OPACITY_MAX,
  GAUSSIAN_OPACITY_MIN,
  GAUSSIAN_SIZE_MAX,
  GAUSSIAN_SIZE_MIN,
} from '../types/viewer'

export interface GaussianAppearanceController {
  setSize: (size: number) => void
  setOpacity: (opacity: number) => void
  reset: () => void
}

export function createGaussianAppearance(
  mesh: SplatMesh,
): GaussianAppearanceController {
  const sizeMultiplier = new dyno.DynoFloat({
    value: DEFAULT_GAUSSIAN_APPEARANCE.size,
  })

  const sizeModifier: GsplatModifier = dyno.dynoBlock(
    { gsplat: dyno.Gsplat },
    { gsplat: dyno.Gsplat },
    ({ gsplat }) => {
      if (!gsplat) {
        return
      }

      const scales = dyno.splitGsplat(gsplat).outputs.scales
      const resizedScales = dyno.mul(scales, sizeMultiplier)

      return {
        gsplat: dyno.combineGsplat({
          gsplat,
          scales: resizedScales,
        }),
      }
    },
  )

  mesh.objectModifiers = [
    ...(mesh.objectModifiers ?? []),
    sizeModifier,
  ]
  mesh.updateGenerator()

  function setSize(size: number): void {
    sizeMultiplier.value = clamp(
      size,
      GAUSSIAN_SIZE_MIN,
      GAUSSIAN_SIZE_MAX,
    )
  }

  function setOpacity(opacity: number): void {
    mesh.opacity = clamp(
      opacity,
      GAUSSIAN_OPACITY_MIN,
      GAUSSIAN_OPACITY_MAX,
    )
  }

  function reset(): void {
    setSize(DEFAULT_GAUSSIAN_APPEARANCE.size)
    setOpacity(DEFAULT_GAUSSIAN_APPEARANCE.opacity)
  }

  reset()

  return {
    setSize,
    setOpacity,
    reset,
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum)
}
