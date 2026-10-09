import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import * as THREE from 'three'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'

class NodeFileReader {
  result = null
  onloadend = null

  async readAsArrayBuffer(blob) {
    this.result = await blob.arrayBuffer()
    this.onloadend?.()
  }

  async readAsDataURL(blob) {
    const bytes = Buffer.from(await blob.arrayBuffer())
    this.result = `data:${blob.type};base64,${bytes.toString('base64')}`
    this.onloadend?.()
  }
}

globalThis.FileReader = NodeFileReader

function createTestScene() {
  const scene = new THREE.Scene()
  scene.name = 'ViewerTestScene'

  const model = new THREE.Group()
  model.name = 'ViewerTestModel'

  const blueMaterial = new THREE.MeshStandardMaterial({
    name: 'BlueMaterial',
    color: 0x3b82f6,
    roughness: 0.45,
    metalness: 0.1,
  })

  const orangeMaterial = new THREE.MeshStandardMaterial({
    name: 'OrangeMaterial',
    color: 0xf59e0b,
    roughness: 0.6,
    metalness: 0,
  })

  const greenMaterial = new THREE.MeshStandardMaterial({
    name: 'GreenMaterial',
    color: 0x22c55e,
    roughness: 0.5,
    metalness: 0.05,
  })

  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 1.2, 1.2),
    blueMaterial,
  )
  cube.name = 'BlueCube'
  cube.position.set(-1.25, 0.6, 0)

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 32, 20),
    orangeMaterial,
  )
  sphere.name = 'OrangeSphere'
  sphere.position.set(0.25, 0.7, 0)

  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.65, 1.6, 32),
    greenMaterial,
  )
  cone.name = 'GreenCone'
  cone.position.set(1.75, 0.8, 0)

  model.add(cube, sphere, cone)
  scene.add(model)

  return scene
}

function disposeScene(scene) {
  scene.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return
    }

    child.geometry.dispose()

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material]

    materials.forEach((material) => material.dispose())
  })
}

async function generateTestGlb() {
  const scene = createTestScene()
  const exporter = new GLTFExporter()
  const exported = await exporter.parseAsync(scene, {
    binary: true,
    onlyVisible: true,
  })

  if (!(exported instanceof ArrayBuffer)) {
    throw new Error('GLTFExporter did not produce binary GLB data.')
  }

  const outputDirectory = resolve('public', 'models')
  const outputPath = resolve(outputDirectory, 'viewer-test.glb')

  await mkdir(outputDirectory, { recursive: true })
  await writeFile(outputPath, Buffer.from(exported))

  disposeScene(scene)

  console.log(`Created ${outputPath}`)
}

await generateTestGlb()
