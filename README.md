# 🧸 3D Squishy Simulator

A premium, interactive 3D simulation of squishy foam toys built with **React**, **Vite**, **Tailwind CSS**, and **Three.js / React Three Fiber (R3F)**. The application models realistic soft-body foam physics, procedurally synthesizes ASMR audio feedback, and lets users design their own custom squishies to store on their toy shelf.

---

## 🎨 Overview & Live View

The simulator features a responsive, pastel-toned interface. Users can spin and tap/drag on 3D squishies directly, trigger automated hand patterns, and see the toys slowly re-inflate back to their original shapes.

### Key Visual & Interactive Features
* **Real-time Vertex Deformation**: Toys dynamically dent and crease under contact points, with custom foam recovery parameters (friction, mass, tension).
* **ASMR Auditory Feedback**: Dual-mode Web Audio API synthesis generating satisfying low-frequency squishes and high-frequency crackles.
* **Procedural Impact Cracking**: Dynamic white fracture lines showing localized starburst glass cracks (on soft spheres) or craquelure glazing network lines (on butter blocks) that fade as the foam rises.
* **Toy Creator**: A slide-up interface with a live auto-rotating 3D preview to configure name, color (palette/wheel), shape, and slow-rise settings, saved persistently in local storage.
* **Active Toy Shelf**: Quick picker to switch between standard toys (Bread Loaf, Hamster Mochi, Avocado, Unicorn, Donut, Cat, Butter, Chocolate) and custom-created ones.

---

## 📂 Core Architecture & File Map

Here is the directory structure detailing where the core logic resides:

```
squishy-sim/
├── src/
│   ├── App.jsx               # Root component: UI layout, shelf state, Invisible Hand controls
│   ├── App.css               # App styles
│   ├── SoundEngine.js        # Procedural audio generator (Web Audio API)
│   ├── components/
│   │   ├── DeformableToy.jsx # Core 3D mesh deforming, accessory rendering, and cracks overlay
│   │   ├── SingleToyView.jsx # Main 3D Canvas wrapper using R3F and OrbitControls
│   │   ├── SquishyCreator.jsx# Toy customization creator modal with shape/color controls
│   │   ├── MiniPreview.jsx   # Spinning 3D canvas preview for the Squishy Creator
│   │   ├── ToyPicker.jsx     # Shelf navigation bar displaying toy emoji thumbnails
│   │   ├── SlownessBar.jsx   # Recovery progress bar visualizing the rise speed timer
│   │   └── FaceExpression.jsx# SVG-based faces used by the legacy 2D prototype
│   ├── hooks/
│   │   └── useSquishy.js     # Legacy helper logic for the 2D SVG version
│   ├── sculptor/
│   │   └── useSculpt.js      # Radial geometry sculpting utility (for custom modeling)
│   ├── data/
│   │   └── toys.js           # Standard toy presets and creator configuration choices
│   └── main.jsx              # Vite app entry point
├── package.json              # Project dependencies (Three, R3F, Framer Motion)
└── vite.config.js            # Vite configurations (includes Tailwind setup)
```

---

## 🔬 How the Deformer Works (Physics & Math)

If you are an agent modifying the 3D deformation logic, check [DeformableToy.jsx](./src/components/DeformableToy.jsx):

### 1. Vertex Displacement
When a point on the surface is pressed (via mouse/touch coordinates or random invisible hand vector $\vec{n}$):
* Vertices within an `innerR` radius of the collision center are pushed inwards along the normal vector $\vec{nx}, \vec{ny}, \vec{nz}$.
* The deformation depth utilizes a quadratic falloff:
  $$f = (1 - \frac{dist}{innerR})^2$$
* Vertices within an outer boundary `outerR` (up to $1.55 \times$ inner radius) bulge outward slightly using a volume-preservation approximation.

### 2. Tangential Wrinkles & Creases
To break symmetry and model realistic folding wrinkles:
* Angle calculation is done in the tangent plane of the press.
* Irregular ripple noise is applied using combined multi-frequency sine and cosine waves:
  $$noise = \sin(dist \times 7 + angle \times 1.9) \times \cos(dist \times 4.3 - angle \times 3.1)$$
* The ripples displace vertices tangentially (perpendicular to the normal) to create folds.

### 3. Slow-Foam Recovery
Once released, the toy recovers to its base state. Instead of linear interpolation, the recovery curve uses an **eased overshoot** (`easeOutBack`):
```javascript
function easeOutBack(t) {
  const c1 = 1.25, c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}
```
This causes the foam to expand, slightly overshoot its original size, and settle back, producing an organic feel. The speed presets scale the duration:
* **Slow (🐌)**: ~4.0s rise time (high mass, high friction)
* **Normal (😐)**: ~2.0s rise time
* **Bouncy (🐇)**: instant snap

### 4. Procedural Crack Overlay
Impact cracks are generated in local coordinate space and drawn using line segments:
* **Star Cracks** (`genCracks`): Radiates 4–6 irregular branches from the center point with high-frequency offsets.
* **Craquelure Glazing** (`genCraquelure`): Generated on blocky shapes (e.g. butter wrappers). Creates an irregular polygon cell network on a local grid.
* The cracks fade out with an opacity decay synced to the toy's rise duration.

---

## 🔊 Procedural ASMR Sound Synthesis

Audio is synthesized dynamically in [SoundEngine.js](./src/SoundEngine.js) to avoid downloading static assets:
* **Squish sound (`playSquish`)**: An oscillator sweep starting at 100Hz and sliding down exponentially to 38Hz over 220ms, controlled by a lowpass filter at 420Hz.
* **Crack sound (`playCrack`)**: Generates 5 micro-bursts of high-frequency white noise through a bandpass filter (centered between 1800Hz and 3800Hz with high Q-factor), decaying exponentially over 55ms.

---

## 🛠️ Developer Setup & Commands

### Running Locally
Run the development server:
```powershell
npm run dev
```

### Production Build
Build and compile assets for production:
```powershell
npm run build
```

### Code Linting
Run oxlint checking:
```powershell
npm run lint
```

---

## 🚀 Inspiration for Future Agents (What to build next)

If you are taking over the repository, consider these feature extensions:
1. **Interactive Sculpting Mode**: Wire up the logic in `useSculpt.js` to a brush UI, allowing users to permanently deform or customize the 3D base mesh shapes.
2. **Add Custom Accessories**: Allow users to attach hats, glasses, or customizable faces to their custom squishies in the Creator modal.
3. **Soft Body Physics Shaders**: Replace CPU vertex manipulation inside `useFrame` with a custom vertex/fragment shader for GPU-driven soft-body wobble.
4. **Export Options**: Allow users to share their created squishies as JSON configurations or download them as 3D models (`.gltf`/`.obj`).
