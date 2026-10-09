import * as THREE from 'three'

export interface DepthMaterialController {
  material: THREE.ShaderMaterial
  setRange: (near: number, far: number) => void
  dispose: () => void
}

export function createDepthMaterial(): DepthMaterialController {
  const uniforms = {
    uDepthNear: {
      value: 0,
    },
    uDepthFar: {
      value: 1,
    },
  }

  const material = new THREE.ShaderMaterial({
    name: 'DepthVisualizationMaterial',
    uniforms,
    vertexShader: `
      varying float vViewDepth;

      void main() {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);

        vViewDepth = -viewPosition.z;

        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      uniform float uDepthNear;
      uniform float uDepthFar;

      varying float vViewDepth;

      void main() {
        float depthRange = max(uDepthFar - uDepthNear, 0.000001);

        float normalizedDepth = clamp(
          (vViewDepth - uDepthNear) / depthRange,
          0.0,
          1.0
        );

        float intensity = 1.0 - normalizedDepth;

        gl_FragColor = vec4(vec3(intensity), 1.0);
      }
    `,
    side: THREE.DoubleSide,
    toneMapped: false,
  })

  function setRange(near: number, far: number): void {
    uniforms.uDepthNear.value = near
    uniforms.uDepthFar.value = Math.max(far, near + 0.000001)
  }

  function dispose(): void {
    material.dispose()
  }

  return {
    material,
    setRange,
    dispose,
  }
}