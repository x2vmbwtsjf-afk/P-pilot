import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Rack, Device } from '../types';

interface Props {
  racks: Rack[];
  devices: Device[];
  onRackSelect: (rack: Rack) => void;
}

interface TooltipState {
  x: number;
  y: number;
  rack: Rack;
  deviceCount: number;
}

const STATUS_COLOR: Record<string, number> = {
  active:         0x1d4ed8,
  maintenance:    0xd97706,
  decommissioned: 0x374151,
};
const STATUS_EMISSIVE: Record<string, number> = {
  active:         0x1e3a8a,
  maintenance:    0x78350f,
  decommissioned: 0x111827,
};

export default function RackRoom3D({ racks, devices, onRackSelect }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // Keep callback ref so effect doesn't re-run when handler changes
  const onRackSelectRef = useRef(onRackSelect);
  useEffect(() => { onRackSelectRef.current = onRackSelect; });

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;

    const W = container.clientWidth;
    const H = container.clientHeight;

    // ── Scene ────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080d17);
    scene.fog = new THREE.FogExp2(0x080d17, 0.018);

    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 120);
    camera.position.set(0, 14, 20);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // ── Controls ─────────────────────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.minDistance = 4;
    controls.maxDistance = 45;
    controls.update();

    // ── Lighting ─────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(12, 24, 12);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.setScalar(1024);
    scene.add(dirLight);

    const fillLight = new THREE.PointLight(0x3b82f6, 0.8, 30);
    fillLight.position.set(-8, 6, -6);
    scene.add(fillLight);

    const warmLight = new THREE.PointLight(0xfbbf24, 0.4, 20);
    warmLight.position.set(8, 4, 6);
    scene.add(warmLight);

    // ── Floor ────────────────────────────────────────────────────────────
    const floorGeo = new THREE.PlaneGeometry(50, 50);
    const floorMat = new THREE.MeshLambertMaterial({ color: 0x0d1520 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(50, 50, 0x1a2535, 0x1a2535);
    scene.add(grid);

    // ── Rack layout ──────────────────────────────────────────────────────
    const rowMap = new Map<string, Rack[]>();
    for (const rack of racks) {
      const row = rack.row ?? '?';
      if (!rowMap.has(row)) rowMap.set(row, []);
      rowMap.get(row)!.push(rack);
    }

    const rows = Array.from(rowMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const totalRows = rows.length;

    const RACK_W = 0.6;
    const RACK_H = 2.0;
    const RACK_D = 1.0;
    const ROW_SPACING = 3.8;
    const RACK_SPACING = 1.3;

    const rackMeshes: Array<{ mesh: THREE.Mesh; rack: Rack; deviceCount: number }> = [];

    rows.forEach(([rowName, rowRacks], rowIdx) => {
      const z = (rowIdx - (totalRows - 1) / 2) * ROW_SPACING;
      const xOffset = ((rowRacks.length - 1) * RACK_SPACING) / 2;

      rowRacks.forEach((rack, rackIdx) => {
        const x = rackIdx * RACK_SPACING - xOffset;
        const status = rack.status ?? 'active';

        // Main chassis
        const geo = new THREE.BoxGeometry(RACK_W, RACK_H, RACK_D);
        const mat = new THREE.MeshPhongMaterial({
          color: STATUS_COLOR[status] ?? STATUS_COLOR.active,
          emissive: STATUS_EMISSIVE[status] ?? STATUS_EMISSIVE.active,
          emissiveIntensity: 0.35,
          shininess: 80,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, RACK_H / 2, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);

        // Door frame edge lines
        const edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(geo),
          new THREE.LineBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.25 }),
        );
        edges.position.copy(mesh.position);
        scene.add(edges);

        // Status glow ring on floor
        if (status !== 'decommissioned') {
          const ringGeo = new THREE.RingGeometry(0.42, 0.58, 32);
          const ringMat = new THREE.MeshBasicMaterial({
            color: status === 'maintenance' ? 0xf59e0b : 0x3b82f6,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.35,
          });
          const ring = new THREE.Mesh(ringGeo, ringMat);
          ring.rotation.x = -Math.PI / 2;
          ring.position.set(x, 0.01, z);
          scene.add(ring);
        }

        const dc = devices.filter(d => d.rackId === rack.id).length;
        rackMeshes.push({ mesh, rack, deviceCount: dc });
      });

      // Row label sprite
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.font = 'bold 38px ui-monospace, monospace';
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`Row ${rowName}`, 128, 32);
      const tex = new THREE.CanvasTexture(canvas);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
      sprite.position.set(0, 3.4, z);
      sprite.scale.set(3.2, 0.8, 1);
      scene.add(sprite);
    });

    // ── Raycasting ───────────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouse2d = new THREE.Vector2();
    let hovered: (typeof rackMeshes)[number] | null = null;

    function pick(e: MouseEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse2d.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse2d.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse2d, camera);
      const hits = raycaster.intersectObjects(rackMeshes.map(r => r.mesh));
      return hits.length > 0 ? (rackMeshes.find(r => r.mesh === hits[0].object) ?? null) : null;
    }

    function onMouseMove(e: MouseEvent) {
      const hit = pick(e);

      if (hovered && hovered !== hit) {
        (hovered.mesh.material as THREE.MeshPhongMaterial).emissiveIntensity = 0.35;
        hovered.mesh.scale.setScalar(1);
      }

      hovered = hit;

      if (hit) {
        (hit.mesh.material as THREE.MeshPhongMaterial).emissiveIntensity = 0.85;
        hit.mesh.scale.set(1.1, 1.06, 1.1);
        const rect = container.getBoundingClientRect();
        const tx = e.clientX - rect.left;
        const ty = e.clientY - rect.top;
        setTooltip({ x: tx, y: ty, rack: hit.rack, deviceCount: hit.deviceCount });
        renderer.domElement.style.cursor = 'pointer';
      } else {
        setTooltip(null);
        renderer.domElement.style.cursor = '';
      }
    }

    function onClick(e: MouseEvent) {
      const hit = pick(e);
      if (hit) onRackSelectRef.current(hit.rack);
    }

    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('click', onClick);

    // ── Resize ───────────────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(container);

    // ── Animation loop ───────────────────────────────────────────────────
    let rafId: number;
    function animate() {
      rafId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('click', onClick);
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, [racks, devices]); // onRackSelect via ref — intentionally excluded

  return (
    <div ref={mountRef} style={{ position: 'relative', width: '100%', height: '68vh', borderRadius: '0.5rem', overflow: 'hidden', background: '#080d17' }}>
      {tooltip && (
        <RackTooltip tooltip={tooltip} containerW={mountRef.current?.clientWidth ?? 600} />
      )}
      <div style={{
        position: 'absolute',
        bottom: '0.75rem',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '0.7rem',
        color: 'rgba(100,116,139,0.7)',
        pointerEvents: 'none',
        userSelect: 'none',
      }}>
        Drag to orbit · Scroll to zoom · Right-click to pan · Click a rack to inspect
      </div>
    </div>
  );
}

function RackTooltip({ tooltip, containerW }: { tooltip: TooltipState; containerW: number }) {
  const flipX = tooltip.x > containerW - 180;
  const statusColor = tooltip.rack.status === 'maintenance' ? '#f59e0b'
    : tooltip.rack.status === 'decommissioned' ? '#6b7280'
    : '#3b82f6';

  return (
    <div style={{
      position: 'absolute',
      left: flipX ? undefined : tooltip.x + 14,
      right: flipX ? containerW - tooltip.x + 14 : undefined,
      top: Math.max(8, tooltip.y - 8),
      background: 'rgba(10, 15, 30, 0.93)',
      border: `1px solid ${statusColor}44`,
      borderRadius: '0.45rem',
      padding: '0.55rem 0.8rem',
      pointerEvents: 'none',
      zIndex: 20,
      fontSize: '0.78rem',
      backdropFilter: 'blur(6px)',
      minWidth: 150,
    }}>
      <div style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: '0.15rem' }}>{tooltip.rack.name}</div>
      {tooltip.rack.rackNumber && (
        <div style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'monospace' }}>#{tooltip.rack.rackNumber}</div>
      )}
      <div style={{ marginTop: '0.35rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{tooltip.deviceCount} device{tooltip.deviceCount !== 1 ? 's' : ''}</span>
        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>·</span>
        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{tooltip.rack.totalU}U</span>
        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>·</span>
        <span style={{ fontSize: '0.7rem', color: statusColor }}>{tooltip.rack.status ?? 'active'}</span>
      </div>
    </div>
  );
}
