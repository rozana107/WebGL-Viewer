import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'

type SupportedMeshExtension = 'glb' | 'gltf' | 'obj'

export async function loadMeshFile(file: File): Promise<THREE.Object3D> {
  const extension = getFileExtension(file.name)

  let object: THREE.Object3D

  switch (extension) {
    case 'glb':
    case 'gltf':
      object = await loadGltfFile(file, extension)
      break

    case 'obj':
      object = await loadObjFile(file)
      applyDefaultObjMaterials(object)
      break

    default:
      throw new Error(`Unsupported mesh format: ${file.name}`)
  }

  ensureMeshNormals(object)
  object.name = file.name

  return object
}

function getFileExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.')

  if (dotIndex === -1) {
    return ''
  }

  return fileName.slice(dotIndex + 1).toLowerCase()
}

async function loadGltfFile(
  file: File,
  extension: Extract<SupportedMeshExtension, 'glb' | 'gltf'>,
): Promise<THREE.Object3D> {
  const loader = new GLTFLoader()

  const source =
    extension === 'glb'
      ? await file.arrayBuffer()
      : await file.text()

  const result = await loader.parseAsync(source, '')

  return result.scene
}

async function loadObjFile(file: File): Promise<THREE.Object3D> {
  const source = await file.text()
  const loader = new OBJLoader()

  return loader.parse(source)
}

function ensureMeshNormals(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return
    }

    const geometry = child.geometry

    if (!geometry.getAttribute('normal')) {
      geometry.computeVertexNormals()
    }
  })
}

function applyDefaultObjMaterials(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return
    }

    const previousMaterials = Array.isArray(child.material)
      ? child.material
      : [child.material]

    previousMaterials.forEach((material) => material.dispose())

    child.material = new THREE.MeshStandardMaterial({
      color: 0xb8c1cc,
      roughness: 0.65,
      metalness: 0,
      vertexColors: Boolean(child.geometry.getAttribute('color')),
    })
  })
}