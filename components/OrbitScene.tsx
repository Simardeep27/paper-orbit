"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useExplorerStore } from "@/lib/state/explorer";
import {
  buildSceneModel,
  createCitationSizeScale,
} from "@/lib/graph/layout";
import {
  getNodeById,
  getVisibleNeighborhood,
  sortNeighborNodes,
} from "@/lib/graph/selectors";
import { PaperTooltip } from "@/components/PaperTooltip";

export interface OrbitSceneHandle {
  capturePng: () => string | null;
  resetCamera: () => void;
  locate: (paperId: string) => void;
}

interface OrbitSceneProps {
  showCitations: boolean;
  showRecommendations: boolean;
}

interface NodeVisual {
  id: string;
  group: THREE.Group;
  mesh: THREE.Mesh;
  selectionSprite: THREE.Sprite;
  target: THREE.Vector3;
  radius: number;
  label: HTMLDivElement;
  candidate: boolean;
}

interface EdgeVisual {
  id: string;
  kind: "citation" | "recommendation";
  source: string;
  target: string;
  object: THREE.Object3D;
  materials: THREE.Material[];
}

/**
 * Capture the explicit fallback URL flag before explorer URL synchronization
 * rewrites the query string. Also supports a test-only window flag set before
 * hydration.
 */
function forcedWebglFailureRequested(): boolean {
  if (typeof window === "undefined") return false;
  return (
    new URLSearchParams(window.location.search).get("forceWebgl") === "0" ||
    (
      window as Window & {
        __PAPER_ORBIT_FORCE_WEBGL_FAIL__?: boolean;
      }
    ).__PAPER_ORBIT_FORCE_WEBGL_FAIL__ === true
  );
}

const FORCED_WEBGL_FAILURE_AT_LOAD = forcedWebglFailureRequested();
let forcedWebglFailureConsumed = false;

interface Engine {
  applyVisibility: (citations: boolean, recommendations: boolean) => void;
  resetCamera: (animate: boolean) => void;
  locate: (paperId: string) => void;
  capturePng: () => string | null;
  setAutoRotate: (value: boolean) => void;
}

const DEFAULT_CAMERA = new THREE.Vector3(0, 5.2, 27);
const DEFAULT_TARGET = new THREE.Vector3(0, 0, 0);

function makeGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(64, 64, 2, 64, 64, 62);
    gradient.addColorStop(0, "rgba(255,255,255,0.95)");
    gradient.addColorStop(0.22, "rgba(147,231,255,0.55)");
    gradient.addColorStop(0.6, "rgba(93,214,244,0.16)");
    gradient.addColorStop(1, "rgba(93,214,244,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeRingTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (context) {
    context.strokeStyle = "rgba(255,255,255,0.95)";
    context.lineWidth = 4;
    context.beginPath();
    context.arc(64, 64, 52, 0, Math.PI * 2);
    context.stroke();
    context.strokeStyle = "rgba(255,255,255,0.28)";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(64, 64, 60, 0, Math.PI * 2);
    context.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function colorForNode(
  memberships: string[],
  isCenter: boolean,
): string {
  if (isCenter) return "#f3f5fa";
  if (memberships.length > 1) return "#f3f5fa";
  if (memberships.includes("citing")) return "#f6be5a";
  if (memberships.includes("recommended")) return "#b69cff";
  return "#5dd6f4";
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const material = mesh.material as
      | THREE.Material
      | THREE.Material[]
      | undefined;
    if (Array.isArray(material)) material.forEach((item) => item.dispose());
    else material?.dispose();
  });
}

function trim(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export const OrbitScene = forwardRef<OrbitSceneHandle, OrbitSceneProps>(
  function OrbitScene({ showCitations, showRecommendations }, ref) {
    const neighborhood = useExplorerStore((state) => state.neighborhood);
    const layout = useExplorerStore((state) => state.layout);
    const filters = useExplorerStore((state) => state.filters);
    const selectedPaperId = useExplorerStore((state) => state.selectedPaperId);
    const compareIds = useExplorerStore((state) => state.compareIds);
    const autoRotate = useExplorerStore((state) => state.autoRotate);
    const resetCameraNonce = useExplorerStore(
      (state) => state.resetCameraNonce,
    );
    const locateNonce = useExplorerStore((state) => state.locateNonce);
    const containerRef = useRef<HTMLDivElement>(null);
    const labelsRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef<Engine | null>(null);
    const [tooltip, setTooltip] = useState<{
      id: string;
      left: number;
      top: number;
    } | null>(null);
    const visibilityRef = useRef({ showCitations, showRecommendations });
    visibilityRef.current = { showCitations, showRecommendations };

    useImperativeHandle(
      ref,
      () => ({
        capturePng: () => engineRef.current?.capturePng() ?? null,
        resetCamera: () => engineRef.current?.resetCamera(true),
        locate: (paperId) => engineRef.current?.locate(paperId),
      }),
      [],
    );

    useEffect(() => {
      if (!neighborhood) return;
      const container = containerRef.current;
      const labelsLayer = labelsRef.current;
      if (!container || !labelsLayer) return;
      const activeNeighborhood = neighborhood;
      const containerElement = container;
      const largeScene = activeNeighborhood.nodes.length > 60;

      const forcedFailure =
        (!forcedWebglFailureConsumed && FORCED_WEBGL_FAILURE_AT_LOAD) ||
        forcedWebglFailureRequested();

      const fail = () => {
        useExplorerStore
          .getState()
          .markWebglFailed();
      };

      if (forcedFailure) {
        forcedWebglFailureConsumed = true;
        fail();
        return;
      }

      const reduceQuery = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      );
      let reducedMotion = reduceQuery.matches;
      const onReduceChange = () => {
        reducedMotion = reduceQuery.matches;
        if (controls) {
          controls.autoRotate =
            !reducedMotion && useExplorerStore.getState().autoRotate;
        }
      };
      reduceQuery.addEventListener?.("change", onReduceChange);

      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: !largeScene,
          alpha: false,
          preserveDrawingBuffer: false,
          powerPreference: "high-performance",
        });
      } catch {
        fail();
        reduceQuery.removeEventListener?.("change", onReduceChange);
        return;
      }

      renderer.setPixelRatio(
        Math.min(largeScene ? 1.5 : 2, window.devicePixelRatio || 1),
      );
      const initialWidth = Math.max(320, container.clientWidth);
      const initialHeight = Math.max(280, container.clientHeight);
      renderer.setSize(initialWidth, initialHeight);
      renderer.setClearColor(0x0b1020, 1);
      renderer.domElement.className = "orbit-canvas";
      renderer.domElement.setAttribute("tabindex", "0");
      renderer.domElement.setAttribute("role", "img");
      renderer.domElement.setAttribute(
        "aria-label",
        "Interactive 3D spherical neighborhood of papers. Drag to orbit, scroll to zoom, click a node to select it. The paper list provides the same information in keyboard order.",
      );
      renderer.domElement.setAttribute(
        "aria-describedby",
        "scene-instructions",
      );
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0b1020);
      const camera = new THREE.PerspectiveCamera(
        50,
        initialWidth / initialHeight,
        0.1,
        200,
      );
      camera.position.copy(DEFAULT_CAMERA);

      let controls: OrbitControls | null = null;
      try {
        controls = new OrbitControls(camera, renderer.domElement);
      } catch {
        renderer.dispose();
        renderer.domElement.remove();
        fail();
        reduceQuery.removeEventListener?.("change", onReduceChange);
        return;
      }
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.rotateSpeed = 0.65;
      controls.zoomSpeed = 0.7;
      controls.panSpeed = 0.6;
      controls.minDistance = 4;
      controls.maxDistance = 55;
      controls.target.copy(DEFAULT_TARGET);
      controls.autoRotate = !reducedMotion && useExplorerStore.getState().autoRotate;
      controls.autoRotateSpeed = 0.55;
      controls.update();

      scene.add(new THREE.AmbientLight(0xb9c7dd, 1.55));
      const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
      keyLight.position.set(12, 18, 20);
      scene.add(keyLight);
      const rimLight = new THREE.DirectionalLight(0x8ad9ff, 1.1);
      rimLight.position.set(-18, -10, -16);
      scene.add(rimLight);
      const centerLight = new THREE.PointLight(0x9fe6ff, 12, 30);
      centerLight.position.set(0, 0, 0);
      scene.add(centerLight);

      const glowTexture = makeGlowTexture();
      const ringTexture = makeRingTexture();
      const sceneModel = buildSceneModel(neighborhood, layout);
      const sizeScale = createCitationSizeScale(sceneModel);

      const decor = new THREE.Group();
      scene.add(decor);
      function addGuides() {
        const shellRadius = layout === "even-shell" ? 8 : 12;
        const shell = new THREE.Mesh(
          new THREE.SphereGeometry(shellRadius, 32, 20),
          new THREE.MeshBasicMaterial({
            color: 0x6d87a9,
            wireframe: true,
            transparent: true,
            opacity: 0.045,
            depthWrite: false,
          }),
        );
        decor.add(shell);

        const radii =
          layout === "even-shell"
            ? [8]
            : [3, 6.5, 10, 11.5];
        for (const [index, radius] of radii.entries()) {
          const points: THREE.Vector3[] = [];
          for (let step = 0; step <= 128; step += 1) {
            const angle = (step / 128) * Math.PI * 2;
            points.push(
              new THREE.Vector3(
                radius * Math.cos(angle),
                radius * Math.sin(angle) * 0.18,
                radius * Math.sin(angle),
              ),
            );
          }
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const material = new THREE.LineBasicMaterial({
            color: index === radii.length - 1 ? 0x6f83a2 : 0x4b5f7c,
            transparent: true,
            opacity: index === radii.length - 1 ? 0.22 : 0.14,
            depthWrite: false,
          });
          const ring = new THREE.LineLoop(geometry, material);
          ring.rotation.x = index * 0.55;
          ring.rotation.y = index * 0.35;
          decor.add(ring);
        }
      }
      addGuides();

      const graph = new THREE.Group();
      scene.add(graph);

      const nodeVisuals = new Map<string, NodeVisual>();
      const edgeVisuals: EdgeVisual[] = [];
      const pickMeshes: THREE.Mesh[] = [];
      const centerPosition = new THREE.Vector3(0, 0, 0);
      const selectedIdRef = {
        current: useExplorerStore.getState().selectedPaperId,
      };

      for (const node of neighborhood.nodes) {
        const isCenter = node.paper.id === neighborhood.centerId;
        const position = sceneModel.positions.get(node.paper.id);
        if (!position) continue;
        const target = new THREE.Vector3(position.x, position.y, position.z);
        const radius = isCenter
          ? 0.52
          : sizeScale.radiusFor(node.paper.citationCount) ?? 0.14;
        const color = new THREE.Color(
          colorForNode(node.memberships, isCenter),
        );

        const group = new THREE.Group();
        group.position.copy(reducedMotion ? target : centerPosition);
        group.userData.target = target;
        group.userData.paperId = node.paper.id;

        const geometry = new THREE.SphereGeometry(
          radius,
          isCenter ? 24 : largeScene ? 12 : 18,
          isCenter ? 18 : largeScene ? 8 : 14,
        );
        const material =
          !isCenter && node.paper.citationCount === null
            ? new THREE.MeshBasicMaterial({
                color,
                wireframe: true,
                transparent: true,
                opacity: 0.9,
              })
            : largeScene
              ? new THREE.MeshLambertMaterial({
                  color,
                  emissive: color
                    .clone()
                    .multiplyScalar(isCenter ? 0.28 : 0.12),
                })
              : new THREE.MeshStandardMaterial({
                  color,
                  roughness: 0.46,
                  metalness: 0.12,
                  emissive: color.clone().multiplyScalar(isCenter ? 0.28 : 0.12),
                  emissiveIntensity: 1,
                });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData.paperId = node.paper.id;
        group.add(mesh);

        if (isCenter) {
          const halo = new THREE.Sprite(
            new THREE.SpriteMaterial({
              map: glowTexture,
              color: 0x9fe6ff,
              transparent: true,
              depthWrite: false,
              blending: THREE.AdditiveBlending,
            }),
          );
          halo.scale.setScalar(3.1);
          group.add(halo);
          const torqueRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.78, 0.012, 8, 80),
            new THREE.MeshBasicMaterial({
              color: 0xf3f5fa,
              transparent: true,
              opacity: 0.6,
            }),
          );
          torqueRing.rotation.x = Math.PI / 2.4;
          torqueRing.rotation.y = 0.3;
          group.add(torqueRing);
        }

        if (node.memberships.length > 1) {
          const outline = new THREE.Mesh(
            new THREE.SphereGeometry(
              radius * 1.32,
              largeScene ? 10 : 16,
              largeScene ? 6 : 12,
            ),
            new THREE.MeshBasicMaterial({
              color: 0xffffff,
              wireframe: true,
              transparent: true,
              opacity: 0.3,
              depthWrite: false,
            }),
          );
          group.add(outline);
        }

        const pick = new THREE.Mesh(
          new THREE.SphereGeometry(
            Math.max(radius * 1.5, 0.34),
            largeScene ? 8 : 10,
            largeScene ? 6 : 8,
          ),
          new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
            depthWrite: false,
          }),
        );
        pick.userData.paperId = node.paper.id;
        group.add(pick);
        pickMeshes.push(pick);

        const selectionSprite = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: ringTexture,
            color: 0x9ed4ff,
            transparent: true,
            depthWrite: false,
            opacity: 0.95,
            blending: THREE.AdditiveBlending,
          }),
        );
        selectionSprite.scale.setScalar(Math.max(1.05, radius * 4.2));
        selectionSprite.visible = false;
        group.add(selectionSprite);

        graph.add(group);
        const label = document.createElement("div");
        label.className = "node-label";
        label.textContent = isCenter
          ? trim(node.paper.title, 46)
          : trim(node.paper.title, 34);
        if (isCenter) label.classList.add("node-label-center");
        label.style.display = "none";
        labelsLayer.appendChild(label);
        nodeVisuals.set(node.paper.id, {
          id: node.paper.id,
          group,
          mesh,
          selectionSprite,
          target,
          radius,
          label,
          candidate: false,
        });
      }

      const candidates = new Set(
        sortNeighborNodes(
          neighborhood.nodes.filter(
            (node) => node.paper.id !== neighborhood.centerId,
          ),
          "similarity",
        )
          .slice(0, 7)
          .map((node) => node.paper.id),
      );
      for (const [id, visual] of nodeVisuals) {
        visual.candidate = candidates.has(id);
        if (id === neighborhood.centerId) visual.candidate = true;
      }

      function addLineEdge(
        id: string,
        kind: "citation" | "recommendation",
        sourceId: string,
        targetId: string,
      ) {
        const source = sceneModel.positions.get(sourceId);
        const target = sceneModel.positions.get(targetId);
        if (!source || !target) return;
        const from = new THREE.Vector3(source.x, source.y, source.z);
        const to = new THREE.Vector3(target.x, target.y, target.z);
        const direction = to.clone().sub(from);
        const length = direction.length();
        if (length < 0.001) return;
        direction.normalize();
        let object: THREE.Object3D;
        let materials: THREE.Material[];
        if (kind === "citation") {
          const targetRadius =
            sizeScale.radiusFor(
              getNodeById(activeNeighborhood, targetId)?.paper.citationCount ??
                null,
            ) ?? 0.16;
          const arrow = new THREE.ArrowHelper(
            direction,
            from,
            Math.max(0.4, length - targetRadius - 0.1),
            0x6f83a2,
            Math.min(0.5, Math.max(0.22, length * 0.16)),
            0.13,
          );
          const lineMaterial = arrow.line.material as THREE.LineBasicMaterial;
          lineMaterial.transparent = true;
          lineMaterial.opacity = 0.3;
          lineMaterial.depthWrite = false;
          const coneMaterial = arrow.cone.material as THREE.MeshBasicMaterial;
          coneMaterial.transparent = true;
          coneMaterial.opacity = 0.52;
          coneMaterial.depthWrite = false;
          object = arrow;
          materials = [lineMaterial, coneMaterial];
        } else {
          const geometry = new THREE.BufferGeometry().setFromPoints([
            from,
            to,
          ]);
          const material = new THREE.LineDashedMaterial({
            color: 0x7a6b9d,
            transparent: true,
            opacity: 0.3,
            dashSize: 0.28,
            gapSize: 0.22,
            depthWrite: false,
          });
          const line = new THREE.Line(geometry, material);
          line.computeLineDistances();
          object = line;
          materials = [material];
        }
        graph.add(object);
        edgeVisuals.push({
          id,
          kind,
          source: sourceId,
          target: targetId,
          object,
          materials,
        });
      }

      for (const edge of neighborhood.edges) {
        addLineEdge(edge.id, "citation", edge.source, edge.target);
      }
      for (const link of neighborhood.recommendations) {
        addLineEdge(link.id, "recommendation", link.source, link.target);
      }

      const visibleIdsRef = { current: new Set<string>() };
      const hoverIdRef = { current: null as string | null };

      function applyVisibility(
        citationsVisible: boolean,
        recommendationsVisible: boolean,
      ) {
        const current = useExplorerStore.getState();
        if (!current.neighborhood) return;
        selectedIdRef.current = current.selectedPaperId;
        const visible = getVisibleNeighborhood(
          current.neighborhood,
          current.filters,
        );
        visibleIdsRef.current = visible.visibleIds;
        for (const [id, visual] of nodeVisuals) {
          visual.group.visible = visible.visibleIds.has(id);
          const selected = current.selectedPaperId === id;
          const compared = current.compareIds.includes(id);
          visual.selectionSprite.visible = selected || compared;
          (
            visual.selectionSprite.material as THREE.SpriteMaterial
          ).color.setHex(selected ? 0x9ed4ff : 0xb69cff);
          visual.group.scale.setScalar(selected ? 1.18 : compared ? 1.08 : 1);
          visual.label.classList.toggle("node-label-selected", selected);
          visual.label.classList.toggle(
            "node-label-center",
            id === current.neighborhood?.centerId,
          );
        }

        for (const edge of edgeVisuals) {
          const visibleForKind =
            edge.kind === "citation"
              ? citationsVisible
              : recommendationsVisible;
          const bothVisible =
            visible.visibleIds.has(edge.source) &&
            visible.visibleIds.has(edge.target);
          const active =
            current.selectedPaperId === edge.source ||
            current.selectedPaperId === edge.target;
          edge.object.visible = visibleForKind && bothVisible;
          for (const material of edge.materials) {
            const tinted = material as THREE.Material & {
              color?: THREE.Color;
              opacity: number;
            };
            if (edge.kind === "citation") {
              tinted.color?.setHex(active ? 0x9ed4ff : 0x6f83a2);
              tinted.opacity = active ? 0.9 : 0.3;
            } else {
              tinted.color?.setHex(active ? 0xb69cff : 0x7a6b9d);
              tinted.opacity = active ? 0.86 : 0.3;
            }
          }
        }
      }

      const cameraTween = {
        active: false,
        startedAt: 0,
        duration: 520,
        fromPosition: new THREE.Vector3(),
        toPosition: new THREE.Vector3(),
        fromTarget: new THREE.Vector3(),
        toTarget: new THREE.Vector3(),
      };

      function startCameraTween(
        position: THREE.Vector3,
        target: THREE.Vector3,
      ) {
        if (!controls) return;
        if (reducedMotion) {
          camera.position.copy(position);
          controls.target.copy(target);
          controls.update();
          cameraTween.active = false;
          return;
        }
        cameraTween.active = true;
        cameraTween.startedAt = performance.now();
        cameraTween.fromPosition.copy(camera.position);
        cameraTween.toPosition.copy(position);
        cameraTween.fromTarget.copy(controls.target);
        cameraTween.toTarget.copy(target);
      }

      function resetCamera(animate: boolean) {
        if (!controls) return;
        if (!animate) {
          cameraTween.active = false;
          camera.position.copy(DEFAULT_CAMERA);
          controls.target.copy(DEFAULT_TARGET);
          controls.update();
          return;
        }
        startCameraTween(DEFAULT_CAMERA, DEFAULT_TARGET);
      }

      function locate(paperId: string) {
        if (!controls) return;
        const visual = nodeVisuals.get(paperId);
        if (!visual) return;
        const position = visual.target.clone();
        if (position.lengthSq() < 0.001) {
          resetCamera(true);
          return;
        }
        const direction = position.clone().normalize();
        const cameraPosition = direction.multiplyScalar(
          Math.max(11, position.length() + 8),
        );
        startCameraTween(
          cameraPosition,
          position.clone().multiplyScalar(0.15),
        );
      }

      function setAutoRotate(value: boolean) {
        if (!controls) return;
        controls.autoRotate = value && !reducedMotion;
      }

      function capturePng() {
        try {
          renderer.render(scene, camera);
          return renderer.domElement.toDataURL("image/png");
        } catch {
          return null;
        }
      }

      engineRef.current = {
        applyVisibility,
        resetCamera,
        locate,
        capturePng,
        setAutoRotate,
      };
      applyVisibility(
        visibilityRef.current.showCitations,
        visibilityRef.current.showRecommendations,
      );
      resetCamera(false);
      if (!reducedMotion && useExplorerStore.getState().autoRotate && controls) {
        controls.autoRotate = true;
      }

      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      const pointerDown = { x: 0, y: 0, time: 0 };
      let interacting = false;
      let disposed = false;

      function pointerToNdc(event: PointerEvent): void {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      }

      function pickAt(event: PointerEvent): string | null {
        pointerToNdc(event);
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(
          pickMeshes.filter((mesh) => {
            let current: THREE.Object3D | null = mesh;
            while (current) {
              if (!current.visible) return false;
              current = current.parent;
            }
            return true;
          }),
          false,
        );
        for (const hit of hits) {
          const id = hit.object.userData.paperId as string | undefined;
          if (id && visibleIdsRef.current.has(id)) return id;
        }
        return null;
      }

      function handlePointerMove(event: PointerEvent) {
        if (interacting) return;
        const id = pickAt(event);
        if (id !== hoverIdRef.current) {
          hoverIdRef.current = id;
          useExplorerStore.getState().setHoveredPaper(id);
        }
        if (!id) {
          setTooltip((current) => (current === null ? current : null));
          renderer.domElement.style.cursor = "grab";
          return;
        }
        const rect = renderer.domElement.getBoundingClientRect();
        const left = Math.min(
          Math.max(6, event.clientX - rect.left + 16),
          Math.max(6, rect.width - 280),
        );
        const top = Math.min(
          Math.max(6, event.clientY - rect.top + 16),
          Math.max(6, rect.height - 174),
        );
        setTooltip({ id, left, top });
        renderer.domElement.style.cursor = "pointer";
      }

      function handlePointerLeave() {
        hoverIdRef.current = null;
        useExplorerStore.getState().setHoveredPaper(null);
        setTooltip(null);
        renderer.domElement.style.cursor = "grab";
      }

      function handlePointerDown(event: PointerEvent) {
        pointerDown.x = event.clientX;
        pointerDown.y = event.clientY;
        pointerDown.time = performance.now();
        renderer.domElement.style.cursor = "grabbing";
      }

      function handlePointerUp(event: PointerEvent) {
        renderer.domElement.style.cursor = "grab";
        const dx = event.clientX - pointerDown.x;
        const dy = event.clientY - pointerDown.y;
        if (Math.hypot(dx, dy) > 5 || performance.now() - pointerDown.time > 650) {
          return;
        }
        const id = pickAt(event);
        useExplorerStore.getState().selectPaper(id);
      }

      function handleKeyDown(event: KeyboardEvent) {
        if (event.key === "Escape") {
          useExplorerStore.getState().selectPaper(null);
        }
      }

      function handleContextLost(event: Event) {
        event.preventDefault();
        fail();
      }

      function handleControlsStart() {
        interacting = true;
        if (controls) controls.autoRotate = false;
        setTooltip(null);
      }

      function handleControlsEnd() {
        interacting = false;
        if (controls) {
          controls.autoRotate =
            !reducedMotion && useExplorerStore.getState().autoRotate;
        }
        renderer.domElement.style.cursor = "grab";
      }

      controls.addEventListener("start", handleControlsStart);
      controls.addEventListener("end", handleControlsEnd);
      renderer.domElement.addEventListener("pointermove", handlePointerMove);
      renderer.domElement.addEventListener("pointerleave", handlePointerLeave);
      renderer.domElement.addEventListener("pointerdown", handlePointerDown);
      renderer.domElement.addEventListener("pointerup", handlePointerUp);
      renderer.domElement.addEventListener("keydown", handleKeyDown);
      renderer.domElement.addEventListener(
        "webglcontextlost",
        handleContextLost,
        false,
      );

      const resizeObserver = new ResizeObserver(() => {
        const width = Math.max(1, containerElement.clientWidth);
        const height = Math.max(1, containerElement.clientHeight);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
      });
      resizeObserver.observe(containerElement);

      const clock = new THREE.Clock();
      let frame = 0;
      const tempVector = new THREE.Vector3();
      const centerDepth = new THREE.Vector3();

      function updateLabels() {
        camera.updateMatrixWorld();
        camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
        centerDepth
          .copy(centerPosition)
          .applyMatrix4(camera.matrixWorldInverse);
        const width = containerElement.clientWidth;
        const height = containerElement.clientHeight;
        const labels: { visual: NodeVisual; z: number }[] = [];

        for (const visual of nodeVisuals.values()) {
          if (!visual.group.visible) {
            visual.label.style.display = "none";
            continue;
          }
          const isCenter = visual.id === neighborhood?.centerId;
          const isSelected = visual.id === selectedIdRef.current;
          if (!isCenter && !isSelected && !visual.candidate) {
            visual.label.style.display = "none";
            continue;
          }
          tempVector.copy(visual.group.position).applyMatrix4(
            camera.matrixWorldInverse,
          );
          const depth = tempVector.z;
          if (!isCenter && !isSelected && depth < centerDepth.z) {
            visual.label.style.display = "none";
            continue;
          }
          tempVector.copy(visual.group.position).project(camera);
          if (tempVector.z < -1 || tempVector.z > 1) {
            visual.label.style.display = "none";
            continue;
          }
          const x = (tempVector.x * 0.5 + 0.5) * width;
          const y = (-tempVector.y * 0.5 + 0.5) * height;
          if (x < -80 || x > width + 80 || y < -30 || y > height + 30) {
            visual.label.style.display = "none";
            continue;
          }
          labels.push({ visual, z: depth });
        }

        labels.sort((a, b) => b.z - a.z);
        let shown = 0;
        for (const entry of labels) {
          const isCenter = entry.visual.id === neighborhood?.centerId;
          const isSelected = entry.visual.id === selectedIdRef.current;
          if (!isCenter && !isSelected && shown >= 7) {
            entry.visual.label.style.display = "none";
            continue;
          }
          const projected = entry.visual.group.position
            .clone()
            .project(camera);
          const x = (projected.x * 0.5 + 0.5) * width;
          const y = (-projected.y * 0.5 + 0.5) * height;
          entry.visual.label.style.left = `${x}px`;
          entry.visual.label.style.top = `${y - 16}px`;
          entry.visual.label.style.display = "block";
          if (!isCenter && !isSelected) shown += 1;
        }
      }

      function animate() {
        if (disposed) return;
        frame = requestAnimationFrame(animate);
        const delta = Math.min(0.05, clock.getDelta());
        if (controls) controls.update();
        if (cameraTween.active && controls) {
          const elapsed = performance.now() - cameraTween.startedAt;
          const t = Math.min(1, elapsed / cameraTween.duration);
          const eased = 1 - Math.pow(1 - t, 3);
          camera.position.lerpVectors(
            cameraTween.fromPosition,
            cameraTween.toPosition,
            eased,
          );
          controls.target.lerpVectors(
            cameraTween.fromTarget,
            cameraTween.toTarget,
            eased,
          );
          if (t >= 1) cameraTween.active = false;
        }
        for (const visual of nodeVisuals.values()) {
          if (reducedMotion) visual.group.position.copy(visual.target);
          else {
            visual.group.position.lerp(
              visual.target,
              Math.min(1, delta * 9),
            );
          }
        }
        updateLabels();
        if (!document.hidden) renderer.render(scene, camera);
      }
      animate();

      return () => {
        disposed = true;
        cancelAnimationFrame(frame);
        resizeObserver.disconnect();
        reduceQuery.removeEventListener?.("change", onReduceChange);
        controls?.removeEventListener("start", handleControlsStart);
        controls?.removeEventListener("end", handleControlsEnd);
        renderer.domElement.removeEventListener("pointermove", handlePointerMove);
        renderer.domElement.removeEventListener(
          "pointerleave",
          handlePointerLeave,
        );
        renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
        renderer.domElement.removeEventListener("pointerup", handlePointerUp);
        renderer.domElement.removeEventListener("keydown", handleKeyDown);
        renderer.domElement.removeEventListener(
          "webglcontextlost",
          handleContextLost,
        );
        controls?.dispose();
        disposeObject(scene);
        glowTexture.dispose();
        ringTexture.dispose();
        renderer.dispose();
        renderer.domElement.remove();
        labelsLayer.replaceChildren();
        if (engineRef.current) engineRef.current = null;
      };
    }, [neighborhood, layout]);

    useEffect(() => {
      engineRef.current?.applyVisibility(showCitations, showRecommendations);
    }, [
      filters,
      selectedPaperId,
      compareIds,
      showCitations,
      showRecommendations,
    ]);

    useEffect(() => {
      engineRef.current?.setAutoRotate(autoRotate);
    }, [autoRotate]);

    useEffect(() => {
      if (resetCameraNonce === 0) return;
      engineRef.current?.resetCamera(true);
    }, [resetCameraNonce]);

    useEffect(() => {
      if (locateNonce === 0) return;
      const id = useExplorerStore.getState().selectedPaperId;
      if (id) engineRef.current?.locate(id);
    }, [locateNonce]);

    useEffect(() => {
      if (!tooltip) return;
      const current = useExplorerStore.getState();
      if (!current.neighborhood) return;
      const node = getNodeById(current.neighborhood, tooltip.id);
      if (!node) setTooltip(null);
    }, [tooltip, filters]);

    const hoveredNode =
      tooltip && neighborhood
        ? getNodeById(neighborhood, tooltip.id)
        : undefined;

    return (
      <div className="scene-container" ref={containerRef}>
        <div className="labels-layer" ref={labelsRef} aria-hidden="true" />
        {tooltip && hoveredNode ? (
          <PaperTooltip
            node={hoveredNode}
            left={tooltip.left}
            top={tooltip.top}
          />
        ) : null}
        <p className="canvas-instructions" id="scene-instructions">
          Drag to orbit · scroll to zoom · click a node for details
        </p>
      </div>
    );
  },
);
