/**
 * VoltSim+ Pro - Motor de Simulación SPICE / MNA (Modified Nodal Analysis)
 * Resuelve circuitos en tiempo real con variedad ampliada de componentes:
 * AC (senoidal, cuadrada, triangular), DC, Diodos (Silicio, Schottky, Zener),
 * LEDs configurables, Lámparas incandescentes, BJT (NPN/PNP), Op-Amps, etc.
 */

class CircuitEngine {
  constructor() {
    this.components = [];
    this.wires = [];
    this.simTime = 0;
    this.timeStep = 0.0001; // 100 µs
    this.isRunning = true;
    this.speedMultiplier = 1.0;

    // Canales del Osciloscopio
    this.ch1NodeId = 1;
    this.ch2NodeId = 0;

    // Resultados
    this.nodeVoltages = new Map();   // nodeId -> Voltaje instantáneo (V)
    this.nodeHistories = new Map();  // nodeId -> array of { t, v }
    this.branchCurrents = new Map(); // compId -> Corriente (A)
    this.capCharges = new Map();     // compId -> Carga instantánea Q = C * V (C)

    this.maxHistoryLength = 400;
  }

  reset() {
    this.simTime = 0;
    this.nodeVoltages.clear();
    this.branchCurrents.clear();
    this.nodeHistories.clear();
    this.capCharges.clear();
    for (const comp of this.components) {
      if (comp.type === 'capacitor') comp.stateV = 0;
      if (comp.type === 'inductor') comp.stateI = 0;
    }
  }

  addComponent(comp) {
    if (!comp.id) comp.id = 'c_' + Math.random().toString(36).substr(2, 9);
    this.components.push(comp);
    return comp;
  }

  removeComponent(compId) {
    this.components = this.components.filter(c => c.id !== compId);
    this.wires = this.wires.filter(w => w.fromComp !== compId && w.toComp !== compId);
    this.branchCurrents.delete(compId);
    this.capCharges.delete(compId);
  }

  addWire(fromComp, fromPin, toComp, toPin) {
    const exists = this.wires.some(w =>
      (w.fromComp === fromComp && w.fromPin === fromPin && w.toComp === toComp && w.toPin === toPin) ||
      (w.fromComp === toComp && w.fromPin === toPin && w.toComp === fromComp && w.toPin === fromPin)
    );
    if (!exists) {
      const wire = {
        id: 'w_' + Math.random().toString(36).substr(2, 9),
        fromComp, fromPin, toComp, toPin
      };
      this.wires.push(wire);
      return wire;
    }
    return null;
  }

  removeWire(wireId) {
    this.wires = this.wires.filter(w => w.id !== wireId);
  }

  buildTopology() {
    const parent = new Map();
    const find = (i) => {
      if (!parent.has(i)) parent.set(i, i);
      if (parent.get(i) === i) return i;
      const root = find(parent.get(i));
      parent.set(i, root);
      return root;
    };
    const union = (i, j) => {
      const rootI = find(i);
      const rootJ = find(j);
      if (rootI !== rootJ) parent.set(rootI, rootJ);
    };

    // Conectar pines mediante cables
    for (const wire of this.wires) {
      union(`${wire.fromComp}:${wire.fromPin}`, `${wire.toComp}:${wire.toPin}`);
    }

    // Identificar componente Ground (Masa = 0V)
    const gndComp = this.components.find(c => c.type === 'ground');
    let gndRoot = null;
    if (gndComp) {
      gndRoot = find(`${gndComp.id}:0`);
    }

    let nextNodeId = 1;
    const rootToNodeId = new Map();
    if (gndRoot !== null) {
      rootToNodeId.set(gndRoot, 0); // Nodo 0 = GND
    }

    const pinMap = new Map();
    for (const comp of this.components) {
      const count = comp.pinCount || 2;
      for (let p = 0; p < count; p++) {
        const key = `${comp.id}:${p}`;
        const r = find(key);
        if (!rootToNodeId.has(r)) {
          rootToNodeId.set(r, nextNodeId++);
        }
        pinMap.set(key, rootToNodeId.get(r));
      }
    }

    this.pinMap = pinMap;
    this.numNodes = nextNodeId;
  }

  getNodeForPin(compId, pinIdx) {
    if (!this.pinMap) return 0;
    const key = `${compId}:${pinIdx}`;
    return this.pinMap.has(key) ? this.pinMap.get(key) : 0;
  }

  /**
   * Resuelve el paso temporal de simulación actual
   */
  stepSimulation(dt) {
    this.buildTopology();
    const N = this.numNodes;
    if (N <= 1) {
      this.simTime += dt;
      return;
    }

    // Identificar fuentes de tensión independientes y controladas
    const vSources = [];
    for (const comp of this.components) {
      if (comp.type === 'dc_source' || comp.type === 'ac_source' ||
          comp.type === 'pulse_source' || comp.type === 'triangle_source' || comp.type === 'opamp') {
        vSources.push(comp);
      }
    }

    const M = vSources.length;
    const matrixSize = (N - 1) + M;

    const A = Array.from({ length: matrixSize }, () => new Float64Array(matrixSize));
    const Z = new Float64Array(matrixSize);

    const stampConductance = (nodeA, nodeB, G) => {
      const i = nodeA - 1;
      const j = nodeB - 1;
      if (nodeA > 0) A[i][i] += G;
      if (nodeB > 0) A[j][j] += G;
      if (nodeA > 0 && nodeB > 0) {
        A[i][j] -= G;
        A[j][i] -= G;
      }
    };

    const stampCurrentSource = (nodeFrom, nodeTo, I) => {
      if (nodeFrom > 0) Z[nodeFrom - 1] -= I;
      if (nodeTo > 0) Z[nodeTo - 1] += I;
    };

    // Estampar componentes pasivos y no lineales
    for (const comp of this.components) {
      const n1 = this.getNodeForPin(comp.id, 0);
      const n2 = this.getNodeForPin(comp.id, 1);

      if (comp.type === 'resistor' || comp.type === 'lamp') {
        const R = Math.max(1e-4, comp.resistance || 100);
        stampConductance(n1, n2, 1 / R);
      } else if (comp.type === 'potentiometer') {
        const totalR = Math.max(10, comp.resistance || 10000);
        const wiperRatio = Math.max(0.001, Math.min(0.999, comp.wiper !== undefined ? comp.wiper : 0.5));
        const R1 = totalR * wiperRatio;
        const R2 = totalR * (1 - wiperRatio);
        const nw = this.getNodeForPin(comp.id, 2);
        stampConductance(n1, nw, 1 / R1);
        stampConductance(nw, n2, 1 / R2);
      } else if (comp.type === 'switch') {
        const R = comp.closed ? 1e-4 : 1e9;
        stampConductance(n1, n2, 1 / R);
      } else if (comp.type === 'push_button') {
        const R = comp.pressed ? 1e-4 : 1e9;
        stampConductance(n1, n2, 1 / R);
      } else if (comp.type === 'capacitor') {
        const C = Math.max(1e-12, comp.capacitance || 10e-6);
        const Gc = (2 * C) / dt;
        const prevV = comp.stateV || 0;
        const Ieq = Gc * prevV;
        stampConductance(n1, n2, Gc);
        stampCurrentSource(n1, n2, Ieq);
      } else if (comp.type === 'inductor') {
        const L = Math.max(1e-6, comp.inductance || 100e-3);
        const Gl = dt / (2 * L);
        const prevI = comp.stateI || 0;
        stampConductance(n1, n2, Gl);
        stampCurrentSource(n1, n2, prevI);
      } else if (comp.type === 'diode' || comp.type === 'schottky' || comp.type === 'led' || comp.type === 'zener') {
        let vDropNominal = 0.7;
        if (comp.type === 'schottky') vDropNominal = 0.3;
        else if (comp.type === 'led') vDropNominal = comp.forwardDrop || 2.0;

        const prevV1 = this.nodeVoltages.get(n1) || 0;
        const prevV2 = this.nodeVoltages.get(n2) || 0;
        const vDiff = prevV1 - prevV2;

        if (comp.type === 'zener' && vDiff < -(comp.zenerVoltage || 5.1)) {
          // Conducción en ruptura Zener inversa
          stampConductance(n1, n2, 1 / 10);
          stampCurrentSource(n1, n2, -(comp.zenerVoltage || 5.1) / 10);
        } else if (vDiff > vDropNominal) {
          // Conducción directa
          const Ron = 15;
          stampConductance(n1, n2, 1 / Ron);
          stampCurrentSource(n1, n2, vDropNominal / Ron);
        } else {
          // Bloqueo
          stampConductance(n1, n2, 1e-7);
        }
      } else if (comp.type === 'npn') {
        // Modelo simplificado BJT NPN: pin0 = Colector, pin1 = Base, pin2 = Emisor
        const nC = this.getNodeForPin(comp.id, 0);
        const nB = this.getNodeForPin(comp.id, 1);
        const nE = this.getNodeForPin(comp.id, 2);

        const vB = this.nodeVoltages.get(nB) || 0;
        const vE = this.nodeVoltages.get(nE) || 0;
        const vBE = vB - vE;
        const beta = comp.beta || 100;

        if (vBE > 0.65) {
          const Rbe = 100;
          stampConductance(nB, nE, 1 / Rbe);
          stampCurrentSource(nB, nE, 0.65 / Rbe);
          const iB = (vBE - 0.65) / Rbe;
          const iC = Math.max(0, beta * iB);
          stampCurrentSource(nC, nE, iC);
        } else {
          stampConductance(nB, nE, 1e-6);
        }
      }
    }

    // Estampar fuentes de tensión
    vSources.forEach((vSrc, idx) => {
      const auxRow = (N - 1) + idx;
      let val = 0;

      if (vSrc.type === 'dc_source') {
        val = vSrc.voltage !== undefined ? vSrc.voltage : 10.0;
      } else if (vSrc.type === 'ac_source') {
        const vp = vSrc.voltagePeak !== undefined ? vSrc.voltagePeak : 10.0;
        const freq = vSrc.frequency || 50;
        const offset = vSrc.offset || 0;
        const phase = (vSrc.phase || 0) * (Math.PI / 180);
        val = offset + vp * Math.sin(2 * Math.PI * freq * this.simTime + phase);
      } else if (vSrc.type === 'pulse_source') {
        const vHigh = vSrc.vHigh !== undefined ? vSrc.vHigh : 5.0;
        const vLow = vSrc.vLow !== undefined ? vSrc.vLow : 0.0;
        const freq = vSrc.frequency || 50;
        const period = 1 / freq;
        const duty = (vSrc.dutyCycle || 50) / 100;
        const tCycle = this.simTime % period;
        val = tCycle < (period * duty) ? vHigh : vLow;
      } else if (vSrc.type === 'triangle_source') {
        const vp = vSrc.voltagePeak !== undefined ? vSrc.voltagePeak : 10.0;
        const freq = vSrc.frequency || 50;
        const offset = vSrc.offset || 0;
        const tCycle = (this.simTime * freq) % 1.0;
        // Onda triangular simétrica de -vp a +vp
        const tri = 2 * Math.abs(2 * tCycle - 1) - 1;
        val = offset + vp * tri;
      } else if (vSrc.type === 'opamp') {
        const inPlus = this.getNodeForPin(vSrc.id, 0);
        const inMinus = this.getNodeForPin(vSrc.id, 1);
        const vPlus = this.nodeVoltages.get(inPlus) || 0;
        const vMinus = this.nodeVoltages.get(inMinus) || 0;
        const diff = vPlus - vMinus;
        const vRail = vSrc.railVoltage || 15.0;
        val = Math.max(-vRail + 1.2, Math.min(vRail - 1.2, diff * 50000));
      }

      const np = vSrc.type === 'opamp' ? this.getNodeForPin(vSrc.id, 2) : this.getNodeForPin(vSrc.id, 0);
      const nn = vSrc.type === 'opamp' ? 0 : this.getNodeForPin(vSrc.id, 1);

      if (np > 0) {
        A[np - 1][auxRow] += 1;
        A[auxRow][np - 1] += 1;
      }
      if (nn > 0) {
        A[nn - 1][auxRow] -= 1;
        A[auxRow][nn - 1] -= 1;
      }
      Z[auxRow] = val;
    });

    const X = this.solveGaussian(A, Z, matrixSize);

    this.nodeVoltages.set(0, 0.0);
    for (let node = 1; node < N; node++) {
      const v = X ? X[node - 1] : 0;
      this.nodeVoltages.set(node, isNaN(v) ? 0 : v);

      if (!this.nodeHistories.has(node)) {
        this.nodeHistories.set(node, []);
      }
      const hist = this.nodeHistories.get(node);
      hist.push({ t: this.simTime, v: this.nodeVoltages.get(node) });
      if (hist.length > this.maxHistoryLength) hist.shift();
    }

    // Actualizar estados reactivos, cargas en capacitores y corrientes
    for (const comp of this.components) {
      const n1 = this.getNodeForPin(comp.id, 0);
      const n2 = this.getNodeForPin(comp.id, 1);
      const v1 = this.nodeVoltages.get(n1) || 0;
      const v2 = this.nodeVoltages.get(n2) || 0;
      const vComp = v1 - v2;

      if (comp.type === 'capacitor') {
        const C = comp.capacitance || 10e-6;
        const Gc = (2 * C) / dt;
        const prevV = comp.stateV || 0;
        const iCap = Gc * (vComp - prevV);
        comp.stateV = vComp;
        this.branchCurrents.set(comp.id, iCap);
        // Carga acumulada Q = C * V (Coulombs)
        this.capCharges.set(comp.id, C * vComp);
      } else if (comp.type === 'inductor') {
        const L = comp.inductance || 100e-3;
        const Gl = dt / (2 * L);
        const prevI = comp.stateI || 0;
        const iInd = prevI + Gl * vComp;
        comp.stateI = iInd;
        this.branchCurrents.set(comp.id, iInd);
      } else if (comp.type === 'resistor' || comp.type === 'lamp') {
        const R = Math.max(1e-4, comp.resistance || 100);
        this.branchCurrents.set(comp.id, vComp / R);
      } else if (comp.type === 'diode' || comp.type === 'schottky' || comp.type === 'led' || comp.type === 'zener') {
        const vf = comp.type === 'schottky' ? 0.3 : (comp.type === 'led' ? (comp.forwardDrop || 2.0) : 0.7);
        const isFwd = vComp > vf;
        const i = isFwd ? (vComp - vf) / 15 : 1e-7;
        this.branchCurrents.set(comp.id, i);
      }
    }

    this.simTime += dt;
  }

  solveGaussian(A, B, n) {
    if (n === 0) return [];
    const M = Array.from({ length: n }, (_, i) => {
      const row = new Float64Array(n + 1);
      for (let j = 0; j < n; j++) row[j] = A[i][j];
      row[n] = B[i];
      return row;
    });

    for (let i = 0; i < n; i++) {
      let maxRow = i;
      let maxVal = Math.abs(M[i][i]);
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(M[k][i]) > maxVal) {
          maxVal = Math.abs(M[k][i]);
          maxRow = k;
        }
      }
      if (maxRow !== i) {
        const temp = M[i];
        M[i] = M[maxRow];
        M[maxRow] = temp;
      }
      if (Math.abs(M[i][i]) < 1e-12) M[i][i] = 1e-12;

      for (let k = i + 1; k < n; k++) {
        const factor = M[k][i] / M[i][i];
        for (let j = i; j <= n; j++) M[k][j] -= factor * M[i][j];
      }
    }

    const x = new Float64Array(n);
    for (let i = n - 1; i >= 0; i--) {
      let sum = M[i][n];
      for (let j = i + 1; j < n; j++) sum -= M[i][j] * x[j];
      x[i] = sum / M[i][i];
    }
    return x;
  }

  getSignalStats(nodeId) {
    const hist = this.nodeHistories.get(nodeId);
    if (!hist || hist.length < 5) {
      const curr = this.nodeVoltages.get(nodeId) || 0;
      return {
        vMax: curr, vMin: curr, vPeak: Math.abs(curr),
        vPp: 0, vRms: Math.abs(curr), vDc: curr, freq: 0, period: 0
      };
    }

    let vMax = -Infinity;
    let vMin = Infinity;
    let sumV = 0;
    let sumSq = 0;

    for (const pt of hist) {
      if (pt.v > vMax) vMax = pt.v;
      if (pt.v < vMin) vMin = pt.v;
      sumV += pt.v;
      sumSq += pt.v * pt.v;
    }

    const n = hist.length;
    const vDc = sumV / n;
    const vRms = Math.sqrt(sumSq / n);
    const vPp = Math.max(0, vMax - vMin);
    const vPeak = vPp / 2;

    let crossings = [];
    const threshold = vDc;
    for (let i = 1; i < hist.length; i++) {
      if (hist[i - 1].v < threshold && hist[i].v >= threshold) {
        crossings.push(hist[i].t);
      }
    }

    let period = 0;
    let freq = 0;
    if (crossings.length >= 2) {
      const intervals = [];
      for (let i = 1; i < crossings.length; i++) {
        intervals.push(crossings[i] - crossings[i - 1]);
      }
      const avgPeriod = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      if (avgPeriod > 0) {
        period = avgPeriod;
        freq = 1 / avgPeriod;
      }
    }

    return { vMax, vMin, vPeak, vPp, vRms, vDc, freq, period };
  }
}

window.CircuitEngine = CircuitEngine;
