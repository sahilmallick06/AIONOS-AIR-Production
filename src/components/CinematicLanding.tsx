import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  Play,
  Pause,
  RotateCcw,
  Camera,
  Volume2,
  VolumeX,
  ChevronRight,
  ChevronDown,
  Compass,
  Radio,
  MousePointer,
  ArrowDown,
} from 'lucide-react';

interface CinematicLandingProps {
  onEnterControlTower: () => void;
  initialScroll?: number;
}

type CameraMode = 'chase' | 'cockpit' | 'tower' | 'wing' | 'flyby';

export const CinematicLanding: React.FC<CinematicLandingProps> = ({
  onEnterControlTower,
  initialScroll = 0,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Flight Progress: 0.0 (Runway start) to 1.0 (Stratospheric cruise / transition)
  const [flightProgress, setFlightProgress] = useState(initialScroll);
  const flightProgressRef = useRef(initialScroll);
  const targetProgressRef = useRef(initialScroll);
  const isPlayingRef = useRef(false); // Default to scroll-driven experience
  const [isPlaying, setIsPlaying] = useState(false);
  const hasTransitionedRef = useRef(false);

  // Camera Mode
  const [cameraMode, setCameraMode] = useState<CameraMode>('chase');
  const cameraModeRef = useRef<CameraMode>('chase');
  cameraModeRef.current = cameraMode;

  // Sound Engine (Web Audio API)
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const engineGainRef = useRef<GainNode | null>(null);
  const engineFilterRef = useRef<BiquadFilterNode | null>(null);

  // Telemetry state
  const [telemetry, setTelemetry] = useState({
    speedKts: 0,
    altitudeFt: 0,
    pitchDeg: 0,
    phase: 'RUNWAY 27R HOLD',
    gearState: 'DOWN & LOCKED',
    throttle: '40% IDLE',
  });

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (!isAudioEnabled) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;

        // Jet engine white noise
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(320, ctx.currentTime);
        engineFilterRef.current = filter;

        const engineGain = ctx.createGain();
        engineGain.gain.setValueAtTime(0.08, ctx.currentTime);
        engineGainRef.current = engineGain;

        noise.connect(filter);
        filter.connect(engineGain);
        engineGain.connect(ctx.destination);
        noise.start();

        setIsAudioEnabled(true);
      } catch (err) {
        console.warn('Web Audio API unavailable:', err);
      }
    } else {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      setIsAudioEnabled(false);
    }
  }, [isAudioEnabled]);

  // Handle Wheel Scroll (Smooth mousewheel / trackpad navigation)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let touchStartY = 0;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Scroll down (positive deltaY) advances the takeoff
      const step = e.deltaY * 0.00095;
      targetProgressRef.current = Math.max(0, Math.min(1.06, targetProgressRef.current + step));
      isPlayingRef.current = false;
      setIsPlaying(false);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        touchStartY = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const deltaY = touchStartY - e.touches[0].clientY;
        touchStartY = e.touches[0].clientY;
        targetProgressRef.current = Math.max(0, Math.min(1.06, targetProgressRef.current + deltaY * 0.002));
        isPlayingRef.current = false;
        setIsPlaying(false);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        targetProgressRef.current = Math.max(0, Math.min(1.06, targetProgressRef.current + 0.05));
        isPlayingRef.current = false;
        setIsPlaying(false);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        targetProgressRef.current = Math.max(0, Math.min(1.06, targetProgressRef.current - 0.05));
        isPlayingRef.current = false;
        setIsPlaying(false);
      }
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('keydown', onKeyDown);

    return () => {
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  // Three.js Scene Setup & Animation
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // 1. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 2. Scene & Fog
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020817); // Deep midnight aviation navy
    scene.fog = new THREE.FogExp2(0x040d21, 0.0018);

    // 3. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 4000);
    camera.position.set(0, 10, 50);

    // 4. Lighting Suite
    const ambientLight = new THREE.AmbientLight(0x1e293b, 1.4);
    scene.add(ambientLight);

    const moonLight = new THREE.DirectionalLight(0xcfd8dc, 2.4);
    moonLight.position.set(200, 400, 200);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 2048;
    moonLight.shadow.mapSize.height = 2048;
    scene.add(moonLight);

    const groundGlow = new THREE.HemisphereLight(0x0284c7, 0x0f172a, 0.7);
    scene.add(groundGlow);

    // 5. Starfield
    const starCount = 2200;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPos[i] = (Math.random() - 0.5) * 2000;
      starPos[i + 1] = Math.random() * 800 + 40;
      starPos[i + 2] = (Math.random() - 0.5) * 2000;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.4,
      transparent: true,
      opacity: 0.85,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // ------------------------------------------------------------------------
    // 6. AIRPORT RUNWAY & ENVIRONMENT
    // ------------------------------------------------------------------------
    const airportGroup = new THREE.Group();

    // Ground Grass / Terrain
    const terrainGeo = new THREE.PlaneGeometry(3000, 3500);
    terrainGeo.rotateX(-Math.PI / 2);
    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0x071120,
      roughness: 0.95,
      metalness: 0.1,
    });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.position.set(0, -0.05, -600);
    terrain.receiveShadow = true;
    airportGroup.add(terrain);

    // Runway 27R Asphalt Tarmac (Forward along -Z axis)
    const runwayWidth = 48;
    const runwayLength = 2200;
    const runwayGeo = new THREE.PlaneGeometry(runwayWidth, runwayLength);
    runwayGeo.rotateX(-Math.PI / 2);
    const runwayMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8,
      metalness: 0.2,
    });
    const runway = new THREE.Mesh(runwayGeo, runwayMat);
    runway.position.set(0, 0, -800);
    runway.receiveShadow = true;
    airportGroup.add(runway);

    // Runway Shoulders
    const shoulderGeo = new THREE.PlaneGeometry(runwayWidth + 24, runwayLength);
    shoulderGeo.rotateX(-Math.PI / 2);
    const shoulderMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.9,
    });
    const shoulder = new THREE.Mesh(shoulderGeo, shoulderMat);
    shoulder.position.set(0, -0.02, -800);
    airportGroup.add(shoulder);

    // Runway Markings (Centerline, Threshold Zebra Stripes, Aiming Points)
    const markingsGroup = new THREE.Group();
    const whiteMarkMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });

    // Threshold Piano Keys (Zebra stripes at z = 220)
    for (let i = -6; i <= 6; i++) {
      if (i === 0) continue;
      const stripeGeo = new THREE.PlaneGeometry(2.2, 35);
      stripeGeo.rotateX(-Math.PI / 2);
      const stripe = new THREE.Mesh(stripeGeo, whiteMarkMat);
      stripe.position.set(i * 3.2, 0.02, 220);
      markingsGroup.add(stripe);
    }

    // Runway Centerline Dashes (every 25 units down the runway)
    for (let z = 180; z >= -1800; z -= 30) {
      const dashGeo = new THREE.PlaneGeometry(1.8, 18);
      dashGeo.rotateX(-Math.PI / 2);
      const dash = new THREE.Mesh(dashGeo, whiteMarkMat);
      dash.position.set(0, 0.02, z);
      markingsGroup.add(dash);
    }

    // Aiming Point Markers (Large blocks at z = 60 and z = -140)
    for (const zPos of [60, -140]) {
      const leftAim = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 45).rotateX(-Math.PI / 2), whiteMarkMat);
      leftAim.position.set(-12, 0.02, zPos);
      markingsGroup.add(leftAim);

      const rightAim = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 45).rotateX(-Math.PI / 2), whiteMarkMat);
      rightAim.position.set(12, 0.02, zPos);
      markingsGroup.add(rightAim);
    }

    airportGroup.add(markingsGroup);

    // Runway Edge Lights
    const runwayLights = new THREE.Group();
    const edgeLightGeo = new THREE.SphereGeometry(0.3, 8, 8);
    const whiteEdgeLightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const greenThresholdMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });

    for (let z = 260; z >= -1800; z -= 35) {
      const leftEdge = new THREE.Mesh(edgeLightGeo, whiteEdgeLightMat);
      leftEdge.position.set(-24, 0.35, z);
      runwayLights.add(leftEdge);

      const rightEdge = new THREE.Mesh(edgeLightGeo, whiteEdgeLightMat);
      rightEdge.position.set(24, 0.35, z);
      runwayLights.add(rightEdge);
    }

    for (let x = -24; x <= 24; x += 4) {
      const threshLight = new THREE.Mesh(edgeLightGeo, greenThresholdMat);
      threshLight.position.set(x, 0.35, 240);
      runwayLights.add(threshLight);
    }

    // Approach Lighting System (ALS) extending back to z = 550
    for (let z = 270; z <= 550; z += 35) {
      const alsStanchion = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3), new THREE.MeshStandardMaterial({ color: 0x64748b }));
      alsStanchion.position.set(0, 1.5, z);
      runwayLights.add(alsStanchion);

      const alsLight = new THREE.Mesh(edgeLightGeo, whiteEdgeLightMat);
      alsLight.position.set(0, 3.1, z);
      runwayLights.add(alsLight);
    }

    airportGroup.add(runwayLights);

    // Airport Control Tower
    const towerGroup = new THREE.Group();
    towerGroup.position.set(90, 0, -280);

    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(5, 7.5, 75, 24),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 })
    );
    shaft.position.y = 37.5;
    towerGroup.add(shaft);

    const cab = new THREE.Mesh(
      new THREE.CylinderGeometry(10, 7.5, 14, 24),
      new THREE.MeshPhysicalMaterial({
        color: 0x0284c7,
        metalness: 0.85,
        roughness: 0.1,
        transparent: true,
        opacity: 0.85,
        emissive: 0x0369a1,
        emissiveIntensity: 0.4,
      })
    );
    cab.position.y = 78;
    towerGroup.add(cab);

    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(4, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 })
    );
    dome.position.y = 86;
    towerGroup.add(dome);

    const radarDish = new THREE.Mesh(
      new THREE.CylinderGeometry(4.5, 0.5, 0.6, 16),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 })
    );
    radarDish.position.set(0, 89, 0);
    radarDish.rotation.z = Math.PI / 4;
    towerGroup.add(radarDish);

    const towerBeacon = new THREE.PointLight(0x38bdf8, 8, 120);
    towerBeacon.position.set(0, 90, 0);
    towerGroup.add(towerBeacon);

    airportGroup.add(towerGroup);

    // Airport Terminal Building
    const terminal = new THREE.Mesh(
      new THREE.BoxGeometry(45, 18, 220),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 })
    );
    terminal.position.set(125, 9, -280);
    airportGroup.add(terminal);

    scene.add(airportGroup);

    // ------------------------------------------------------------------------
    // 7. COMPLETE COMMERCIAL AIRLINER MODEL (A350 / B787 TWINJET)
    // ------------------------------------------------------------------------
    // COORDINATE CONVENTION:
    // Forward travel is along -Z axis!
    // Nose points towards -Z!
    // Tail points towards +Z!
    // Left Wing (Port) on -X, Right Wing (Starboard) on +X.
    // ------------------------------------------------------------------------
    const aircraft = new THREE.Group();

    // Aircraft Materials
    const airframeMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.35,
      roughness: 0.25,
    });
    const liveryBlueMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // AIONOS Aviation Cyan
      metalness: 0.5,
      roughness: 0.25,
    });
    const titaniumMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.85,
      roughness: 0.2,
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.95,
      roughness: 0.05,
    });
    const rubberMat = new THREE.MeshStandardMaterial({
      color: 0x0a0f1d,
      roughness: 0.9,
    });
    const cockpitGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x091428,
      metalness: 0.9,
      roughness: 0.08,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      reflectivity: 0.95,
    });

    // ------------------------------------------------------------------------
    // A. FUSELAGE & AERODYNAMIC BELLY FAIRING
    // ------------------------------------------------------------------------
    // Main Cabin Tube: length 22 units, radius 1.5 units
    const fuselageGeo = new THREE.CylinderGeometry(1.5, 1.48, 22, 36);
    fuselageGeo.rotateX(-Math.PI / 2); // Aligns along Z axis
    const fuselageMesh = new THREE.Mesh(fuselageGeo, airframeMat);
    fuselageMesh.position.set(0, 0, 0);
    fuselageMesh.castShadow = true;
    aircraft.add(fuselageMesh);

    // Streamlined Nose Radome (Smooth front cap pointing forward towards -Z)
    const noseGeo = new THREE.ConeGeometry(1.5, 7.5, 36);
    noseGeo.rotateX(Math.PI / 2); // Points towards -Z
    const noseMesh = new THREE.Mesh(noseGeo, airframeMat);
    noseMesh.position.set(0, -0.05, -14.75);
    noseMesh.castShadow = true;
    aircraft.add(noseMesh);

    // Cockpit Windshield (Multi-pane visor at the top of the nose)
    const cockpitGeo = new THREE.SphereGeometry(1.49, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.38);
    cockpitGeo.rotateX(-Math.PI / 5);
    const cockpitMesh = new THREE.Mesh(cockpitGeo, cockpitGlassMat);
    cockpitMesh.position.set(0, 0.45, -12.5);
    cockpitMesh.scale.set(1.0, 0.85, 1.3);
    aircraft.add(cockpitMesh);

    // Fuselage Tailcone (Tapers gracefully back towards +Z)
    const tailConeGeo = new THREE.ConeGeometry(1.48, 9, 36);
    tailConeGeo.rotateX(-Math.PI / 2); // Points towards +Z
    const tailConeMesh = new THREE.Mesh(tailConeGeo, airframeMat);
    tailConeMesh.position.set(0, 0.45, 15.5);
    tailConeMesh.castShadow = true;
    aircraft.add(tailConeMesh);

    // APU Exhaust Nozzle at tail tip
    const apuHole = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.6, 16).rotateX(-Math.PI / 2), titaniumMat);
    apuHole.position.set(0, 0.9, 20);
    aircraft.add(apuHole);

    // Wing-to-Body Belly Fairing (Seamlessly merges wings to the fuselage)
    const bellyFairing = new THREE.Mesh(
      new THREE.CylinderGeometry(2.1, 2.0, 11, 24).rotateX(-Math.PI / 2),
      airframeMat
    );
    bellyFairing.scale.set(1.15, 0.48, 1.0);
    bellyFairing.position.set(0, -0.85, 0.5);
    aircraft.add(bellyFairing);

    // Passenger Cabin Windows (Left & Right) with Warm Amber Interior Glow
    const windowMat = new THREE.MeshBasicMaterial({ color: 0xffedd5 });
    for (let z = -9.5; z <= 9.5; z += 1.1) {
      const winL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.26, 0.5), windowMat);
      winL.position.set(-1.51, 0.25, z);
      aircraft.add(winL);

      const winR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.26, 0.5), windowMat);
      winR.position.set(1.51, 0.25, z);
      aircraft.add(winR);
    }

    // AIONOS Cyan Cheatline Livery Belt
    const stripeGeo = new THREE.BoxGeometry(0.04, 0.44, 20);
    const stripeL = new THREE.Mesh(stripeGeo, liveryBlueMat);
    stripeL.position.set(-1.51, -0.05, 0);
    aircraft.add(stripeL);

    const stripeR = new THREE.Mesh(stripeGeo, liveryBlueMat);
    stripeR.position.set(1.51, -0.05, 0);
    aircraft.add(stripeR);

    // Satcom Wi-Fi Dome on Roof
    const satcomDome = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), airframeMat);
    satcomDome.scale.set(0.65, 0.35, 2.6);
    satcomDome.position.set(0, 1.55, -2);
    aircraft.add(satcomDome);

    // ------------------------------------------------------------------------
    // B. COMPLETE SWEPT WINGS (SYMMETRIC & SOLID 3D AIRFOIL)
    // ------------------------------------------------------------------------
    // Build a true 3D parametric tapered swept wing:
    // Root chord: z in [-4.2, +3.8] at x = 1.4
    // Tip chord: z in [+1.8, +4.4] at x = 17.5
    // Dihedral: rises smoothly from y = -0.3 to y = +0.75
    // ------------------------------------------------------------------------
    const buildParametricWing = (isRight: boolean): THREE.Group => {
      const wingGroup = new THREE.Group();
      const sign = isRight ? 1 : -1;

      // Spanwise stations: 0 (root), 0.25 (pylon mount), 0.65 (mid), 1.0 (tip)
      const spanSteps = 6;
      const vertices: number[] = [];
      const indices: number[] = [];

      // Grid of cross-sections: each slice has 6 chordwise vertices around airfoil
      // [0: Leading edge, 1: Upper crest, 2: Upper trailing, 3: Lower trailing, 4: Lower belly]
      for (let i = 0; i <= spanSteps; i++) {
        const s = i / spanSteps;
        const x = sign * (1.4 + s * 16.2);
        const zLE = -4.2 + s * 6.2; // Sweeps back
        const zTE = 3.8 + s * 0.6;
        const chord = zTE - zLE;
        const yMid = -0.3 + s * 1.05; // +3.5 deg dihedral upward
        const thickness = (0.75 * (1 - s * 0.68));

        // Airfoil points
        const pts = [
          [x, yMid, zLE],                               // 0: LE
          [x, yMid + thickness * 0.55, zLE + chord * 0.32], // 1: Upper crest
          [x, yMid + thickness * 0.08, zTE],              // 2: Upper TE
          [x, yMid - thickness * 0.08, zTE],              // 3: Lower TE
          [x, yMid - thickness * 0.45, zLE + chord * 0.38], // 4: Lower belly
        ];

        for (const pt of pts) {
          vertices.push(pt[0], pt[1], pt[2]);
        }
      }

      // Connect adjacent span slices with quads (two triangles)
      const ptsPerSlice = 5;
      for (let i = 0; i < spanSteps; i++) {
        const baseA = i * ptsPerSlice;
        const baseB = (i + 1) * ptsPerSlice;

        for (let j = 0; j < ptsPerSlice; j++) {
          const nextJ = (j + 1) % ptsPerSlice;
          const a1 = baseA + j;
          const a2 = baseA + nextJ;
          const b1 = baseB + j;
          const b2 = baseB + nextJ;

          if (isRight) {
            indices.push(a1, b1, b2);
            indices.push(a1, b2, a2);
          } else {
            indices.push(a1, b2, b1);
            indices.push(a1, a2, b2);
          }
        }
      }

      // Endcap at wingtip
      const tipBase = spanSteps * ptsPerSlice;
      if (isRight) {
        indices.push(tipBase + 0, tipBase + 1, tipBase + 2);
        indices.push(tipBase + 0, tipBase + 2, tipBase + 3);
        indices.push(tipBase + 0, tipBase + 3, tipBase + 4);
      } else {
        indices.push(tipBase + 0, tipBase + 2, tipBase + 1);
        indices.push(tipBase + 0, tipBase + 3, tipBase + 2);
        indices.push(tipBase + 0, tipBase + 4, tipBase + 3);
      }

      const wingGeo = new THREE.BufferGeometry();
      wingGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      wingGeo.setIndex(indices);
      wingGeo.computeVertexNormals();

      const wingMesh = new THREE.Mesh(wingGeo, airframeMat);
      wingMesh.castShadow = true;
      wingMesh.receiveShadow = true;
      wingGroup.add(wingMesh);

      // Flap Track Canoes (Aerodynamic pods under the wing trailing edge)
      for (const s of [0.28, 0.58, 0.82]) {
        const x = sign * (1.4 + s * 16.2);
        const zTE = 3.8 + s * 0.6;
        const yMid = -0.3 + s * 1.05;
        const canoe = new THREE.Mesh(
          new THREE.CylinderGeometry(0.24, 0.08, 3.2, 12).rotateX(-Math.PI / 2),
          airframeMat
        );
        canoe.position.set(x, yMid - 0.5, zTE - 0.9);
        wingGroup.add(canoe);
      }

      // Blended Sharklet Winglet (Gracefully curved upward 2.6 units at wingtip)
      const tipX = sign * 17.6;
      const tipY = 0.75;
      const tipZ = 3.2;

      const wingletGeo = new THREE.BoxGeometry(0.18, 2.8, 1.6);
      const winglet = new THREE.Mesh(wingletGeo, liveryBlueMat);
      winglet.position.set(tipX + sign * 0.2, tipY + 1.3, tipZ);
      winglet.rotation.z = sign * 0.28;
      winglet.rotation.y = sign * -0.18;
      wingGroup.add(winglet);

      return wingGroup;
    };

    aircraft.add(buildParametricWing(false)); // Left Port Wing
    aircraft.add(buildParametricWing(true));  // Right Starboard Wing

    // ------------------------------------------------------------------------
    // C. TWIN HIGH-BYPASS TURBOFAN ENGINES
    // Rigid underwing pylons mounted forward to wings, facing forward (-Z)
    // ------------------------------------------------------------------------
    const fanRotors: THREE.Mesh[] = [];
    const jetExhaustGlows: THREE.PointLight[] = [];

    const createTurbofanEngine = (xPos: number): THREE.Group => {
      const engGroup = new THREE.Group();
      engGroup.position.set(xPos, -0.95, -1.0);

      // Pylon Mount securely welded to Wing Lower Surface
      const pylon = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 1.25, 4.4),
        airframeMat
      );
      pylon.position.set(0, 0.7, 0.2);
      engGroup.add(pylon);

      // Engine Nacelle Outer Cowling (Facing forward towards -Z)
      const cowlGeo = new THREE.CylinderGeometry(1.0, 0.95, 4.6, 32, 1, true);
      cowlGeo.rotateX(-Math.PI / 2);
      const cowl = new THREE.Mesh(cowlGeo, airframeMat);
      cowl.castShadow = true;
      engGroup.add(cowl);

      // Titanium Intake Lip Ring (Front of engine at z = -2.3)
      const intakeLip = new THREE.Mesh(
        new THREE.TorusGeometry(0.98, 0.09, 16, 32),
        chromeMat
      );
      intakeLip.position.set(0, 0, -2.3);
      engGroup.add(intakeLip);

      // Inner Core Compressor Chamber
      const chamberGeo = new THREE.CylinderGeometry(0.92, 0.86, 4.2, 24);
      chamberGeo.rotateX(-Math.PI / 2);
      const chamber = new THREE.Mesh(chamberGeo, titaniumMat);
      engGroup.add(chamber);

      // Spinning Fan Rotor & Spinner Cone
      const spinnerGroup = new THREE.Group();
      spinnerGroup.position.set(0, 0, -1.6);

      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.4, 1.3, 18).rotateX(-Math.PI / 2),
        titaniumMat
      );
      spinnerGroup.add(cone);

      // 18 Fan Blades
      for (let b = 0; b < 18; b++) {
        const blade = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, 0.55, 0.03),
          chromeMat
        );
        blade.position.set(0, 0.45, 0);
        blade.rotation.z = (b * Math.PI * 2) / 18;
        blade.rotation.y = 0.45;
        spinnerGroup.add(blade);
      }
      engGroup.add(spinnerGroup);
      fanRotors.push(spinnerGroup as any);

      // Engine Core Exhaust Nozzle (Rear of engine at z = +2.7)
      const exhaustNozzle = new THREE.Mesh(
        new THREE.ConeGeometry(0.7, 1.6, 24).rotateX(Math.PI / 2),
        titaniumMat
      );
      exhaustNozzle.position.set(0, 0, 2.8);
      engGroup.add(exhaustNozzle);

      // Dynamic Jet Thrust Exhaust Glow
      const thrustLight = new THREE.PointLight(0x38bdf8, 0, 16);
      thrustLight.position.set(0, 0, 3.6);
      engGroup.add(thrustLight);
      jetExhaustGlows.push(thrustLight);

      // Thrust Flame Cone
      const flameGeo = new THREE.ConeGeometry(0.6, 4.0, 16);
      flameGeo.rotateX(-Math.PI / 2);
      const flameMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
      });
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.set(0, 0, 4.2);
      engGroup.add(flame);

      return engGroup;
    };

    aircraft.add(createTurbofanEngine(-6.0)); // Left Engine 1
    aircraft.add(createTurbofanEngine(6.0));  // Right Engine 2

    // ------------------------------------------------------------------------
    // D. EMPENNAGE (Vertical Tailfin & Horizontal Stabilizers)
    // ------------------------------------------------------------------------
    // Swept Vertical Stabilizer Fin
    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0);
    finShape.lineTo(0, 6.8);
    finShape.lineTo(3.2, 6.8);
    finShape.lineTo(6.8, 0);
    finShape.lineTo(0, 0);

    const finExtrude = { depth: 0.28, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.05, bevelThickness: 0.05 };
    const finGeo = new THREE.ExtrudeGeometry(finShape, finExtrude);
    finGeo.rotateY(Math.PI / 2);

    const finMesh = new THREE.Mesh(finGeo, liveryBlueMat);
    finMesh.position.set(0, 1.4, 11.5);
    finMesh.castShadow = true;
    aircraft.add(finMesh);

    // Swept Horizontal Stabilizers (Left & Right)
    const buildHorizontalTail = (isRight: boolean): THREE.Mesh => {
      const sign = isRight ? 1 : -1;
      const hTailGeo = new THREE.BoxGeometry(5.5, 0.18, 2.8);
      const hTail = new THREE.Mesh(hTailGeo, airframeMat);
      hTail.position.set(sign * 3.4, 1.2, 16.2);
      hTail.rotation.y = sign * -0.22;
      hTail.rotation.z = sign * 0.05;
      hTail.castShadow = true;
      return hTail;
    };
    aircraft.add(buildHorizontalTail(false));
    aircraft.add(buildHorizontalTail(true));

    // ------------------------------------------------------------------------
    // E. RETRACTABLE LANDING GEAR SYSTEM
    // Sits flush on Runway 27R (y = 3.7) and retracts after liftoff
    // ------------------------------------------------------------------------
    const landingGearGroup = new THREE.Group();

    // 1. Nose Landing Gear (Forward at z = -10.5)
    const noseGearAssembly = new THREE.Group();
    noseGearAssembly.position.set(0, -1.3, -10.5);

    const noseStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.4, 16), chromeMat);
    noseStrut.position.set(0, -1.2, 0);
    noseGearAssembly.add(noseStrut);

    const noseAxle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 12).rotateZ(Math.PI / 2), titaniumMat);
    noseAxle.position.set(0, -2.4, 0);
    noseGearAssembly.add(noseAxle);

    const wheelGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.28, 20).rotateZ(Math.PI / 2);
    const noseWheelL = new THREE.Mesh(wheelGeo, rubberMat);
    noseWheelL.position.set(-0.35, -2.4, 0);
    const noseWheelR = new THREE.Mesh(wheelGeo, rubberMat);
    noseWheelR.position.set(0.35, -2.4, 0);
    noseGearAssembly.add(noseWheelL, noseWheelR);
    landingGearGroup.add(noseGearAssembly);

    // 2. Main Landing Gear (4-wheel bogies under both wings)
    const createMainGear = (isRight: boolean): THREE.Group => {
      const mainGear = new THREE.Group();
      mainGear.position.set(isRight ? 3.6 : -3.6, -1.3, 1.2);

      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.16, 2.4, 16), chromeMat);
      strut.position.set(0, -1.2, 0);
      mainGear.add(strut);

      const bogie = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 1.8), titaniumMat);
      bogie.position.set(0, -2.4, 0);
      mainGear.add(bogie);

      const mainWheelGeo = new THREE.CylinderGeometry(0.62, 0.62, 0.36, 20).rotateZ(Math.PI / 2);
      for (const zOffset of [-0.65, 0.65]) {
        const mwL = new THREE.Mesh(mainWheelGeo, rubberMat);
        mwL.position.set(-0.4, -2.4, zOffset);
        const mwR = new THREE.Mesh(mainWheelGeo, rubberMat);
        mwR.position.set(0.4, -2.4, zOffset);
        mainGear.add(mwL, mwR);
      }
      return mainGear;
    };

    landingGearGroup.add(createMainGear(false));
    landingGearGroup.add(createMainGear(true));
    aircraft.add(landingGearGroup);

    // ------------------------------------------------------------------------
    // F. LIGHTING SUITE
    // High-intensity landing lights, navigation beacons & strobes
    // ------------------------------------------------------------------------
    const landingLightL = new THREE.SpotLight(0xffffff, 18, 220, Math.PI / 6, 0.4);
    landingLightL.position.set(-2.5, -0.6, -5);
    landingLightL.target.position.set(-2.5, -2.4, -90);
    aircraft.add(landingLightL);
    aircraft.add(landingLightL.target);

    const landingLightR = new THREE.SpotLight(0xffffff, 18, 220, Math.PI / 6, 0.4);
    landingLightR.position.set(2.5, -0.6, -5);
    landingLightR.target.position.set(2.5, -2.4, -90);
    aircraft.add(landingLightR);
    aircraft.add(landingLightR.target);

    // Navigation Wingtip Beacons
    const portNavLight = new THREE.PointLight(0xff0033, 4, 15);
    portNavLight.position.set(-17.8, 1.3, 3.2);
    aircraft.add(portNavLight);

    const starNavLight = new THREE.PointLight(0x00ff66, 4, 15);
    starNavLight.position.set(17.8, 1.3, 3.2);
    aircraft.add(starNavLight);

    // Flashing Wingtip Strobes
    const strobeLightL = new THREE.PointLight(0xffffff, 0, 40);
    strobeLightL.position.set(-17.9, 1.3, 3.2);
    aircraft.add(strobeLightL);

    const strobeLightR = new THREE.PointLight(0xffffff, 0, 40);
    strobeLightR.position.set(17.9, 1.3, 3.2);
    aircraft.add(strobeLightR);

    // Red Anti-Collision Beacons
    const beaconTop = new THREE.PointLight(0xff0022, 2, 20);
    beaconTop.position.set(0, 1.7, -1);
    aircraft.add(beaconTop);

    const beaconBottom = new THREE.PointLight(0xff0022, 2, 20);
    beaconBottom.position.set(0, -1.6, 2);
    aircraft.add(beaconBottom);

    // Initial Aircraft Placement on Runway Tarmac
    aircraft.position.set(0, 3.7, 180);
    aircraft.rotation.set(0, 0, 0); // Facing forward along -Z!
    scene.add(aircraft);

    // ------------------------------------------------------------------------
    // 8. VOLUMETRIC 3D CLOUDS AT ALTITUDE
    // ------------------------------------------------------------------------
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.95,
      transparent: true,
      opacity: 0.45,
    });

    for (let c = 0; c < 28; c++) {
      const cluster = new THREE.Group();
      const puffCount = 5 + Math.floor(Math.random() * 4);
      for (let p = 0; p < puffCount; p++) {
        const puff = new THREE.Mesh(
          new THREE.SphereGeometry(10 + Math.random() * 12, 12, 10),
          cloudMat
        );
        puff.position.set((Math.random() - 0.5) * 35, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 35);
        cluster.add(puff);
      }
      cluster.position.set(
        (Math.random() - 0.5) * 500,
        90 + Math.random() * 140,
        -600 - Math.random() * 1200
      );
      scene.add(cluster);
    }

    // ------------------------------------------------------------------------
    // 9. ANIMATION LOOP & TAKEOFF PHYSICS
    // ------------------------------------------------------------------------
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // If autoplay is active, advance target progress
      if (isPlayingRef.current) {
        targetProgressRef.current = Math.min(1.05, targetProgressRef.current + delta * 0.055);
      }

      // Smooth dampening towards target progress (smooth scroll inertia)
      flightProgressRef.current += (targetProgressRef.current - flightProgressRef.current) * 0.12;
      const p = Math.max(0, Math.min(1.0, flightProgressRef.current));
      setFlightProgress(p);

      // Check if user has scrolled all the way to completion (take off -> transition to dashboard!)
      if (flightProgressRef.current >= 0.995 && !hasTransitionedRef.current) {
        hasTransitionedRef.current = true;
        onEnterControlTower();
      }

      // Spin Engine Turbofans
      const fanSpeed = 0.25 + Math.min(1.0, p * 3) * 0.85;
      fanRotors.forEach((rotor) => {
        rotor.rotation.z += fanSpeed * 0.9;
      });

      // Flashing strobes & beacons
      const strobeOn = Math.sin(elapsed * 4.5) > 0.85;
      strobeLightL.intensity = strobeOn ? 25 : 0;
      strobeLightR.intensity = strobeOn ? 25 : 0;

      const beaconOn = Math.sin(elapsed * 2.8) > 0.7;
      beaconTop.intensity = beaconOn ? 4.5 : 0.2;
      beaconBottom.intensity = beaconOn ? 4.5 : 0.2;

      // Rotate Airport Tower Radar
      radarDish.rotation.y = elapsed * 1.8;
      towerBeacon.intensity = 4 + Math.sin(elapsed * 3) * 3;

      // ------------------------------------------------------------------------
      // TAKEOFF & FLIGHT TRAJECTORY CHOREOGRAPHY
      // Forward direction: -Z
      // ------------------------------------------------------------------------
      let currentSpeed = 0;
      let currentAlt = 0;
      let currentPitch = 0;
      let phaseLabel = 'RUNWAY 27R HOLD';
      let gearLabel = 'DOWN & LOCKED';
      let throttleLabel = '40% IDLE';

      if (p <= 0.15) {
        // STAGE 1: RUNWAY LINEUP
        const norm = p / 0.15;
        currentSpeed = Math.round(norm * 35);
        currentAlt = 0;
        currentPitch = 0;
        phaseLabel = 'RUNWAY 27R LINEUP';
        gearLabel = 'DOWN & LOCKED';
        throttleLabel = `${Math.round(40 + norm * 60)}% TOGA`;

        aircraft.position.set(0, 3.7, 180 - norm * 45);
        aircraft.rotation.set(0, 0, 0);

        landingGearGroup.position.y = 0;
        landingGearGroup.scale.set(1, 1, 1);
        jetExhaustGlows.forEach((l) => (l.intensity = norm * 4));

      } else if (p <= 0.42) {
        // STAGE 2: TAKEOFF GROUND ROLL (Full Acceleration)
        const norm = (p - 0.15) / 0.27;
        currentSpeed = Math.round(35 + norm * 115); // 35 -> 150 kts
        currentAlt = 0;
        currentPitch = 0;
        phaseLabel = currentSpeed > 135 ? 'V1 — TAKEOFF DECISION' : 'TAKEOFF ROLL — FULL THRUST';
        gearLabel = 'DOWN & LOCKED';
        throttleLabel = '100% MAXIMUM THRUST';

        const zPos = 135 - (norm * norm) * 585;
        aircraft.position.set(0, 3.7, zPos);
        aircraft.rotation.set(0, 0, 0);

        jetExhaustGlows.forEach((l) => (l.intensity = 12));

      } else if (p <= 0.58) {
        // STAGE 3: ROTATION (VR) & LIFTOFF
        const norm = (p - 0.42) / 0.16;
        currentSpeed = Math.round(150 + norm * 45); // 150 -> 195 kts
        currentAlt = Math.round(norm * 450);         // 0 -> 450 ft AGL
        currentPitch = Math.round(norm * 14);        // 0 -> 14 deg pitch up
        phaseLabel = 'VR ROTATION & POSITIVE RATE';
        gearLabel = norm > 0.7 ? 'RETRACTING...' : 'AIRBORNE';
        throttleLabel = 'CLIMB THRUST';

        const pitchAngle = (norm * 14 * Math.PI) / 180;
        const zPos = -450 - norm * 350;
        const yPos = 3.7 + Math.pow(norm, 1.6) * 35;

        aircraft.position.set(0, yPos, zPos);
        aircraft.rotation.set(-pitchAngle, 0, 0); // Lifts nose into sky

        if (norm > 0.6) {
          const gearNorm = (norm - 0.6) / 0.4;
          landingGearGroup.position.y = gearNorm * 1.5;
          landingGearGroup.scale.set(1 - gearNorm * 0.4, 1 - gearNorm * 0.7, 1);
        }

      } else if (p <= 0.78) {
        // STAGE 4: GEAR UP & INITIAL CLIMB
        const norm = (p - 0.58) / 0.2;
        currentSpeed = Math.round(195 + norm * 85);   // 195 -> 280 kts
        currentAlt = Math.round(450 + norm * 4800);   // 450 -> 5,250 ft
        currentPitch = Math.round(14 - norm * 3);     // 14 -> 11 deg
        phaseLabel = 'INITIAL CLIMBOUT (LNAV/VNAV)';
        gearLabel = 'UP & RETRACTED';
        throttleLabel = 'CLIMB THRUST';

        const pitchAngle = (12 * Math.PI) / 180;
        const zPos = -800 - norm * 650;
        const yPos = 38.7 + norm * 120;
        const rollAngle = (Math.sin(norm * Math.PI) * 10 * Math.PI) / 180;

        aircraft.position.set(-norm * 25, yPos, zPos);
        aircraft.rotation.set(-pitchAngle, norm * 0.08, rollAngle);
        landingGearGroup.scale.set(0, 0, 0);

      } else {
        // STAGE 5: CRUISE EN ROUTE
        const norm = (p - 0.78) / 0.22;
        currentSpeed = Math.round(280 + norm * 200);   // 280 -> 480 kts
        currentAlt = Math.round(5250 + norm * 26750);  // 5,250 -> 32,000 ft
        currentPitch = 4;
        phaseLabel = p >= 0.98 ? 'ENTERING RESOLUTION CONTROL' : 'ALT CRUISE 32,000 FT';
        gearLabel = 'UP & RETRACTED';
        throttleLabel = 'CRUISE AUTO-THROTTLE';

        const zPos = -1450 - norm * 700;
        const yPos = 158.7 + norm * 80;

        aircraft.position.set(-25 - norm * 15, yPos, zPos);
        aircraft.rotation.set((-4 * Math.PI) / 180, 0.08, -0.04);
        landingGearGroup.scale.set(0, 0, 0);

        renderer.toneMappingExposure = 1.25 + norm * 0.15;
      }

      setTelemetry({
        speedKts: currentSpeed,
        altitudeFt: currentAlt,
        pitchDeg: currentPitch,
        phase: phaseLabel,
        gearState: gearLabel,
        throttle: throttleLabel,
      });

      // ------------------------------------------------------------------------
      // CAMERA SYSTEM
      // ------------------------------------------------------------------------
      const mode = cameraModeRef.current;
      const targetPos = aircraft.position;

      if (mode === 'cockpit') {
        const forwardVec = new THREE.Vector3(0, 0.6, -13).applyEuler(aircraft.rotation);
        camera.position.copy(targetPos).add(forwardVec);
        const lookTarget = targetPos.clone().add(new THREE.Vector3(0, 0.6, -90).applyEuler(aircraft.rotation));
        camera.lookAt(lookTarget);

      } else if (mode === 'tower') {
        camera.position.set(90, 80, -280);
        camera.lookAt(targetPos.x, targetPos.y + 2, targetPos.z);

      } else if (mode === 'wing') {
        const wingOffset = new THREE.Vector3(7.2, 1.2, 2.5).applyEuler(aircraft.rotation);
        camera.position.copy(targetPos).add(wingOffset);
        const wingLook = targetPos.clone().add(new THREE.Vector3(0, 0, -35).applyEuler(aircraft.rotation));
        camera.lookAt(wingLook);

      } else if (mode === 'flyby') {
        camera.position.set(-35, 4.5, -350);
        camera.lookAt(targetPos.x, targetPos.y + 2, targetPos.z);

      } else {
        // CHASE CAM (Aerodynamic perspective)
        const chaseOffset = new THREE.Vector3(
          0,
          10 + (currentAlt > 100 ? 5 : 0),
          38 + (currentSpeed > 200 ? 12 : 0)
        ).applyEuler(aircraft.rotation);

        const desiredCamPos = targetPos.clone().add(chaseOffset);
        camera.position.lerp(desiredCamPos, 0.12);
        camera.lookAt(targetPos.x, targetPos.y + 2, targetPos.z - 15);
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [onEnterControlTower]);

  // Jump to specific flight phase
  const handleSeek = (progressVal: number) => {
    targetProgressRef.current = progressVal;
    flightProgressRef.current = progressVal;
    setFlightProgress(progressVal);
  };

  // Replay from Runway Start
  const handleReplay = () => {
    hasTransitionedRef.current = false;
    targetProgressRef.current = 0.0;
    flightProgressRef.current = 0.0;
    setFlightProgress(0.0);
    isPlayingRef.current = false;
    setIsPlaying(false);
  };

  // Toggle Auto-Fly Play / Pause
  const togglePlay = () => {
    const next = !isPlaying;
    isPlayingRef.current = next;
    setIsPlaying(next);
  };

  return (
    <div
      ref={containerRef}
      id="cinematic-takeoff-experience"
      className="relative w-full h-screen overflow-hidden select-none bg-[#020617] cursor-ns-resize"
    >
      {/* Three.js 3D WebGL Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* TOP HEADER OVERLAY */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 sm:p-6 flex items-center justify-between pointer-events-none">
        {/* Airline Brand Title */}
        <div className="pointer-events-auto flex items-center space-x-3 bg-slate-900/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-700/60 shadow-lg">
          <div className="w-8 h-8 rounded-lg bg-[#0284C7] flex items-center justify-center text-white shadow-sm">
            <Compass className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-white tracking-widest text-sm uppercase">
                AIONOS <span className="text-[#38BDF8]">AIR</span>
              </span>
              <span className="text-slate-500">/</span>
              <span className="text-[11px] font-mono text-sky-300 font-semibold uppercase">
                FLIGHT SK-2026
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              Wednesday, 23 Sep 2026 • Runway 27R Takeoff
            </p>
          </div>
        </div>

        {/* Enter Resolution Control Tower Button & Audio Toggle */}
        <div className="pointer-events-auto flex items-center space-x-3">
          <button
            onClick={toggleAudio}
            title={isAudioEnabled ? 'Mute jet sound' : 'Unmute jet sound'}
            className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-colors shadow-lg cursor-pointer"
          >
            {isAudioEnabled ? <Volume2 className="w-4 h-4 text-sky-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>

          <button
            onClick={onEnterControlTower}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0284C7] to-[#0369A1] hover:from-[#0369A1] hover:to-[#075985] text-white text-xs sm:text-sm font-bold shadow-lg border border-sky-400/40 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <span>Enter Resolution Control</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* TOP-RIGHT TELEMETRY HUD TAPE */}
      <div className="absolute top-20 right-4 sm:right-6 z-20 pointer-events-none hidden sm:block">
        <div className="bg-slate-900/85 backdrop-blur-md p-4 rounded-xl border border-slate-700/70 text-white font-mono text-xs shadow-xl w-64 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-700/70 pb-2 text-[10px] text-sky-400 uppercase tracking-widest font-bold">
            <span className="flex items-center space-x-1">
              <Radio className="w-3 h-3 animate-pulse text-sky-400" />
              <span>FLIGHT TELEMETRY</span>
            </span>
            <span className="text-emerald-400 font-semibold">● ACTIVE</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
            <div className="bg-slate-800/60 p-2 rounded border border-slate-700/40">
              <span className="text-slate-400 block text-[9px] uppercase">AIRSPEED</span>
              <span className="text-base font-bold text-white tracking-wider">{telemetry.speedKts}</span>
              <span className="text-[9px] text-slate-400 ml-1">KTS</span>
            </div>

            <div className="bg-slate-800/60 p-2 rounded border border-slate-700/40">
              <span className="text-slate-400 block text-[9px] uppercase">ALTITUDE</span>
              <span className="text-base font-bold text-white tracking-wider">
                {telemetry.altitudeFt.toLocaleString()}
              </span>
              <span className="text-[9px] text-slate-400 ml-1">FT</span>
            </div>
          </div>

          <div className="space-y-1 text-[10px] pt-1">
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">PHASE:</span>
              <span className="text-sky-300 font-bold">{telemetry.phase}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">LANDING GEAR:</span>
              <span className={telemetry.gearState.includes('UP') ? 'text-emerald-400 font-semibold' : 'text-amber-300 font-semibold'}>
                {telemetry.gearState}
              </span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">THRUST:</span>
              <span className="text-sky-200">{telemetry.throttle}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">PITCH ATTITUDE:</span>
              <span className="text-sky-200">+{telemetry.pitchDeg}°</span>
            </div>
          </div>
        </div>
      </div>

      {/* CAMERA SELECTOR DOCK (Left middle on desktop) */}
      <div className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
        <div className="pointer-events-auto bg-slate-900/85 backdrop-blur-md p-2 rounded-xl border border-slate-700/60 shadow-xl flex flex-col space-y-1.5">
          <span className="text-[9px] font-mono text-slate-400 px-2 py-1 uppercase font-bold text-center border-b border-slate-700/60">
            CAMERAS
          </span>
          {[
            { id: 'chase', label: 'Chase Cam' },
            { id: 'cockpit', label: 'Cockpit' },
            { id: 'tower', label: 'Tower Cam' },
            { id: 'wing', label: 'Wing View' },
            { id: 'flyby', label: 'Runway Flyby' },
          ].map((cam) => (
            <button
              key={cam.id}
              onClick={() => setCameraMode(cam.id as CameraMode)}
              className={`px-3 py-1.5 rounded-lg text-left text-xs font-mono transition-all flex items-center space-x-2 cursor-pointer ${
                cameraMode === cam.id
                  ? 'bg-[#0284C7] text-white font-bold shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5 opacity-80" />
              <span>{cam.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* CENTER SCROLL PROMPT (Visible when near runway start) */}
      {flightProgress < 0.85 && (
        <div className="absolute bottom-28 sm:bottom-32 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="bg-slate-900/80 backdrop-blur-md px-5 py-2.5 rounded-full border border-slate-700/70 shadow-2xl flex items-center space-x-3 text-sky-200 text-xs font-medium animate-pulse">
            <MousePointer className="w-4 h-4 text-sky-400" />
            <span>Scroll down or swipe to fly takeoff → Enter Control Tower</span>
            <ArrowDown className="w-4 h-4 text-sky-400 animate-bounce" />
          </div>
        </div>
      )}

      {/* BOTTOM FLIGHT CONTROLS & SCROLL TIMELINE DOCK */}
      <div className="absolute bottom-6 left-0 right-0 z-20 px-4 sm:px-8 pointer-events-none">
        <div className="max-w-4xl mx-auto pointer-events-auto bg-slate-900/90 backdrop-blur-lg p-4 sm:p-5 rounded-2xl border border-slate-700/80 shadow-2xl space-y-3">
          {/* Top Bar of Controller: Auto-fly toggle, Replay, Phase Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <button
                onClick={togglePlay}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold transition-all shadow cursor-pointer"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause Auto</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Auto Fly</span>
                  </>
                )}
              </button>

              <button
                onClick={handleReplay}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
                title="Restart takeoff from Runway 27R"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset Runway</span>
              </button>
            </div>

            {/* Quick-Jump Flight Stages */}
            <div className="flex items-center space-x-1 sm:space-x-1.5 overflow-x-auto text-[11px] font-mono">
              {[
                { label: '1. Lineup', val: 0.05 },
                { label: '2. Takeoff Roll', val: 0.28 },
                { label: '3. Rotate V1', val: 0.48 },
                { label: '4. Climbout', val: 0.68 },
                { label: '5. Stratosphere', val: 0.95 },
              ].map((stage) => {
                const isActive = Math.abs(flightProgress - stage.val) < 0.12;
                return (
                  <button
                    key={stage.label}
                    onClick={() => handleSeek(stage.val)}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-sky-500/30 text-sky-300 font-bold border border-sky-400/50'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    {stage.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Progress Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
              <span className="flex items-center space-x-1">
                <ChevronDown className="w-3 h-3 text-sky-400" />
                <span>Runway 27R (Scroll down to advance)</span>
              </span>
              <span className="text-sky-400 font-bold">
                {Math.round(flightProgress * 100)}% TAKEOFF PROGRESS
              </span>
              <span className="text-emerald-400 font-semibold">
                Cruise → Auto-Enter Resolution Tower
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.001"
              value={flightProgress}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#0284C7] focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
