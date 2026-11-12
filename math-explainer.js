/**
 * VoltSim+ Pro - Motor de Cálculos Analíticos Paso a Paso
 * Genera el desarrollo formal completo: Cargas eléctricas (Qmax, Qmin),
 * Energías (Ec, El), constantes de tiempo (Tau), voltajes extremos, potencias e impedancias.
 */

class MathExplainer {
  constructor(engine, oscilloscope) {
    this.engine = engine;
    this.oscilloscope = oscilloscope;
    this.selectedComponent = null;

    this.lastUpdateTime = 0;
    this.updateInterval = 200;
  }

  setSelectedComponent(comp) {
    this.selectedComponent = comp;
    this.updateCircuitTab(comp);
  }

  update(now) {
    if (now - this.lastUpdateTime < this.updateInterval) return;
    this.lastUpdateTime = now;

    const activeNode = this.oscilloscope.activeNodeId;
    const stats = this.engine.getSignalStats(activeNode);
    this.updateACTab(stats, activeNode);
    this.updateReactanceTab(stats);
    if (this.selectedComponent) {
      this.updateCircuitTab(this.selectedComponent);
    }
  }

  /**
   * Pestaña 1: Ondas, Picos, Cargas Eléctricas (Q) y Energías
   */
  updateACTab(stats, nodeId) {
    const titleEl = document.getElementById('math-signal-title');
    if (titleEl) {
      titleEl.textContent = `Análisis Señal: ${this.oscilloscope.activeNodeName}`;
    }

    const vMax = stats.vMax;
    const vMin = stats.vMin;
    const vPp = stats.vPp;
    const vDc = stats.vDc;
    const vPeak = stats.vPeak;
    const vRms = stats.vRms;
    const freq = stats.freq;
    const period = stats.period;

    // Paso 1: Vmax y Vmin
    const elVmax = document.getElementById('calc-vmax');
    const elVmin = document.getElementById('calc-vmin');
    if (elVmax) elVmax.textContent = `${vMax >= 0 ? '+' : ''}${vMax.toFixed(2)} V`;
    if (elVmin) elVmin.textContent = `${vMin >= 0 ? '+' : ''}${vMin.toFixed(2)} V`;

    // Paso 2: Vpp
    const elVpp = document.getElementById('step-calc-vpp');
    if (elVpp) {
      const sMax = `${vMax >= 0 ? '+' : ''}${vMax.toFixed(2)} V`;
      const sMin = `(${vMin >= 0 ? '+' : ''}${vMin.toFixed(2)} V)`;
      elVpp.innerHTML = `V_{pp} = ${sMax} - ${sMin} = <strong>${vPp.toFixed(2)} V</strong>`;
    }

    // Paso 3: Offset DC
    const elVdc = document.getElementById('step-calc-vdc');
    const elVdcExp = document.getElementById('exp-vdc');
    if (elVdc) {
      const sMax = `${vMax >= 0 ? '+' : ''}${vMax.toFixed(2)} V`;
      const sMin = `${vMin >= 0 ? '+' : ''}${vMin.toFixed(2)} V`;
      elVdc.innerHTML = `V_{dc} = \\frac{${sMax} + (${sMin})}{2} = <strong>${vDc.toFixed(2)} V</strong>`;
    }
    if (elVdcExp) {
      if (Math.abs(vDc) < 0.05) {
        elVdcExp.innerHTML = `💡 Al ser prácticamente cero (\(V_{dc} \\approx 0\\text{V}\)), la señal es <strong>simétrica y pura en corriente alterna</strong>.`;
      } else {
        elVdcExp.innerHTML = `💡 La señal tiene un <strong>desplazamiento continuo (offset) de ${vDc.toFixed(2)} V</strong> que eleva todo el eje de oscilación.`;
      }
    }

    // Paso 4: Voltaje Pico
    const elVp = document.getElementById('step-calc-vp');
    if (elVp) {
      elVp.innerHTML = `V_p = \\frac{${vPp.toFixed(2)}\\text{ V}}{2} = <strong>${vPeak.toFixed(2)} V</strong>
        <br><span style="font-size: 0.68rem; color: #8b9bb4;">Comprobación de cresta: V_{max} - V_{dc} = (${vMax.toFixed(2)}) - (${vDc.toFixed(2)}) = ${(vMax - vDc).toFixed(2)} V</span>`;
    }

    // Paso 5: Voltaje RMS
    const elVrms = document.getElementById('step-calc-vrms');
    if (elVrms) {
      const vRmsAc = vPeak / Math.SQRT2;
      let html = `V_{rms(ac)} = \\frac{${vPeak.toFixed(2)}\\text{ V}}{\\sqrt{2}} = \\frac{${vPeak.toFixed(2)}}{1.4142} = <strong>${vRmsAc.toFixed(2)} V</strong>`;
      if (Math.abs(vDc) > 0.05) {
        const vRmsTotal = Math.sqrt(vDc * vDc + vRmsAc * vRmsAc);
        html += `<br><span style="color: var(--accent-yellow)">V_{rms(total)} = \\sqrt{(${vDc.toFixed(2)})^2 + (${vRmsAc.toFixed(2)})^2} = <strong>${vRmsTotal.toFixed(2)} V</strong></span>`;
      }
      elVrms.innerHTML = html;
    }

    // Paso 6: CARGAS ELÉCTRICAS Q = C * V
    const cap = this.engine.components.find(c => c.type === 'capacitor');
    const C = cap ? cap.capacitance : 10e-6; // Usar capacitor del circuito o 10uF didáctico
    const cMicro = (C * 1e6).toFixed(1);

    const qMaxC = C * Math.abs(vMax);
    const qMinC = C * Math.abs(vMin);
    const deltaQC = C * vPp;

    const elQmax = document.getElementById('step-calc-qmax');
    const elQmin = document.getElementById('step-calc-qmin');
    const elDeltaQ = document.getElementById('step-calc-deltaq');

    if (elQmax) {
      const qMicro = (qMaxC * 1e6).toFixed(2);
      elQmax.innerHTML = `Q_{max} = C \\cdot |V_{max}| = (${cMicro}\\mu\\text{F}) \\cdot (${Math.abs(vMax).toFixed(2)}\\text{V}) = <strong>${qMicro} \\mu\\text{C}</strong> (${qMaxC.toExponential(3)} C)`;
    }
    if (elQmin) {
      const qMicro = (qMinC * 1e6).toFixed(2);
      elQmin.innerHTML = `Q_{min} = C \\cdot |V_{min}| = (${cMicro}\\mu\\text{F}) \\cdot (${Math.abs(vMin).toFixed(2)}\\text{V}) = <strong>${qMicro} \\mu\\text{C}</strong>`;
    }
    if (elDeltaQ) {
      const qMicro = (deltaQC * 1e6).toFixed(2);
      elDeltaQ.innerHTML = `\\Delta Q = C \\cdot V_{pp} = (${cMicro}\\mu\\text{F}) \\cdot (${vPp.toFixed(2)}\\text{V}) = <strong>${qMicro} \\mu\\text{C}</strong> transferidos por ciclo`;
    }

    // Paso 7: ENERGÍAS ALMACENADAS Ec y El
    const elEc = document.getElementById('step-calc-ec');
    const elEl = document.getElementById('step-calc-el');
    if (elEc) {
      const ecJoules = 0.5 * C * Math.pow(Math.abs(vMax), 2);
      const ecMilli = (ecJoules * 1000).toFixed(3);
      elEc.innerHTML = `E_C = \\frac{1}{2} C (V_{max})^2 = \\frac{1}{2} (${cMicro}\\mu\\text{F}) \\cdot (${Math.abs(vMax).toFixed(2)}\\text{V})^2 = <strong>${ecMilli} mJ</strong> (${ecJoules.toExponential(2)} J)`;
    }
    if (elEl) {
      const ind = this.engine.components.find(c => c.type === 'inductor');
      if (ind) {
        const L = ind.inductance || 100e-3;
        const iInd = Math.abs(this.engine.branchCurrents.get(ind.id) || 0);
        const elJoules = 0.5 * L * Math.pow(iInd, 2);
        const elMilli = (elJoules * 1000).toFixed(3);
        const lMilli = (L * 1000).toFixed(0);
        elEl.innerHTML = `E_L = \\frac{1}{2} L (I_{max})^2 = \\frac{1}{2} (${lMilli}\\text{mH}) \\cdot (${(iInd * 1000).toFixed(1)}\\text{mA})^2 = <strong>${elMilli} mJ</strong>`;
      } else {
        elEl.innerHTML = `E_L = \\frac{1}{2} L I^2 (Agrega un inductor al circuito para calcular su energía magnética)`;
      }
    }

    // Paso 8: Frecuencia y Periodo
    const elPeriod = document.getElementById('calc-period');
    const elFreq = document.getElementById('step-calc-freq');
    const elOmega = document.getElementById('step-calc-omega');

    if (freq > 0.1 && period > 0) {
      const pMs = (period * 1000).toFixed(2);
      if (elPeriod) elPeriod.textContent = `${pMs} ms (${period.toFixed(4)} s)`;
      if (elFreq) elFreq.innerHTML = `f = \\frac{1}{${period.toFixed(4)}\\text{ s}} = <strong>${freq.toFixed(2)} Hz</strong>`;
      if (elOmega) {
        const omega = 2 * Math.PI * freq;
        elOmega.innerHTML = `\\omega = 2 \\cdot \\pi \\cdot (${freq.toFixed(1)}) = <strong>${omega.toFixed(2)} rad/s</strong>`;
      }
    } else {
      if (elPeriod) elPeriod.textContent = `N/A (Corriente Continua)`;
      if (elFreq) elFreq.innerHTML = `f = <strong>0.00 Hz (DC)</strong>`;
      if (elOmega) elOmega.innerHTML = `\\omega = <strong>0.00 rad/s</strong>`;
    }
  }

  /**
   * Pestaña 2: Cálculos según el elemento activo seleccionado
   */
  updateCircuitTab(comp) {
    const container = document.getElementById('dynamic-circuit-calculations');
    if (!container) return;

    if (!comp) {
      container.innerHTML = `
        <div class="step-card">
          <div class="step-num">Selección</div>
          <div class="step-body">
            <p>Haz clic en cualquier componente del circuito para ver el desarrollo de sus fórmulas, corriente y potencia.</p>
          </div>
        </div>
      `;
      return;
    }

    const n1 = this.engine.getNodeForPin(comp.id, 0);
    const n2 = this.engine.getNodeForPin(comp.id, 1);
    const v1 = this.engine.nodeVoltages.get(n1) || 0;
    const v2 = this.engine.nodeVoltages.get(n2) || 0;
    const vComp = v1 - v2;
    const iComp = this.engine.branchCurrents.get(comp.id) || 0;
    const absI = Math.abs(iComp);

    let html = ``;

    // 1. RESISTENCIA
    if (comp.type === 'resistor') {
      const R = comp.resistance || 1000;
      const P = Math.abs(vComp * iComp);
      html += `
        <div class="step-card">
          <div class="step-num">Resistencia: ${comp.label || 'R'}</div>
          <div class="step-body">
            <h5>Ley de Ohm & Disipación Térmica</h5>
            <div class="formula-box">
              <div class="formula-line"><span>Voltaje en bornes (\(\\Delta V\)):</span> <strong>${vComp.toFixed(2)} V</strong></div>
              <div class="formula-rule">Cálculo de Corriente: <strong>I = \\frac{\\Delta V}{R}</strong></div>
              <div class="formula-calc">I = \\frac{${vComp.toFixed(2)}\\text{ V}}{${R}\\ \\Omega} = <strong>${(absI * 1000).toFixed(2)} mA</strong> (${absI.toFixed(5)} A)</div>
              <div class="formula-rule">Potencia Calorífica (Joule): <strong>P = V \\cdot I = I^2 \\cdot R</strong></div>
              <div class="formula-calc">P = (${vComp.toFixed(2)}\\text{V}) \\cdot (${absI.toFixed(4)}\\text{A}) = <strong>${(P * 1000).toFixed(1)} mW</strong> (${P.toFixed(4)} W)</div>
            </div>
          </div>
        </div>
      `;
    }

    // 2. CAPACITOR (Cálculo de Constante Tau y Cargas)
    else if (comp.type === 'capacitor') {
      const C = comp.capacitance || 10e-6;
      const cMicro = (C * 1e6).toFixed(1);
      const qInst = C * Math.abs(vComp);
      const res = this.engine.components.find(c => c.type === 'resistor');
      const R = res ? res.resistance : 1000;
      const tau = R * C;
      const tFull = 5 * tau;

      html += `
        <div class="step-card primary-step">
          <div class="step-num">Capacitor: ${comp.label || 'C'}</div>
          <div class="step-body">
            <h5>Carga Acumulada & Constante de Tiempo (\(\\tau\))</h5>
            <div class="formula-box">
              <div class="formula-line"><span>Tensión actual (\(v_C\)):</span> <strong>${vComp.toFixed(2)} V</strong></div>
              <div class="formula-rule">Carga electrostática instantánea: <strong>Q(t) = C \\cdot v_C(t)</strong></div>
              <div class="formula-calc">Q = (${cMicro}\\mu\\text{F}) \\cdot (${Math.abs(vComp).toFixed(2)}\\text{V}) = <strong>${(qInst * 1e6).toFixed(2)} \\mu\\text{C}</strong></div>
              <div class="formula-rule">Constante de tiempo de carga: <strong>\\tau = R \\cdot C</strong></div>
              <div class="formula-calc">\\tau = (${R}\\ \\Omega) \\cdot (${cMicro}\\mu\\text{F}) = <strong>${(tau * 1000).toFixed(2)} ms</strong></div>
              <div class="formula-rule">Tiempo para Carga Completa (99.3%): <strong>t_{5\\tau} = 5 \\cdot \\tau</strong></div>
              <div class="formula-calc">t_{5\\tau} = 5 \\cdot ${(tau * 1000).toFixed(2)}\\text{ms} = <strong>${(tFull * 1000).toFixed(2)} ms</strong></div>
            </div>
            <div class="step-explanation">
              💡 Durante un tiempo de \(1\\tau\), el capacitor se carga al <strong>63.2%</strong> del voltaje de la fuente; en \(5\\tau\) se considera completamente cargado.
            </div>
          </div>
        </div>
      `;
    }

    // 3. POTENCIÓMETRO (Divisor Ajustable)
    else if (comp.type === 'potentiometer') {
      const totalR = comp.resistance || 10000;
      const ratio = comp.wiper !== undefined ? comp.wiper : 0.5;
      const r1 = Math.round(totalR * ratio);
      const r2 = Math.round(totalR * (1 - ratio));

      html += `
        <div class="step-card">
          <div class="step-num">Potenciómetro: ${comp.label || 'POT'}</div>
          <div class="step-body">
            <h5>División Proporcional de Resistencia</h5>
            <div class="formula-box">
              <div class="formula-line"><span>Posición del cursor:</span> <strong>${Math.round(ratio * 100)} %</strong></div>
              <div class="formula-line"><span>Rama R1 (Arriba):</span> <strong>${r1} Ω</strong></div>
              <div class="formula-line"><span>Rama R2 (Abajo):</span> <strong>${r2} Ω</strong></div>
              <div class="formula-rule">Fórmula de Tensión de Salida: <strong>V_{wiper} = V_{in} \\cdot (1 - \\text{ratio})</strong></div>
            </div>
          </div>
        </div>
      `;
    }

    // 4. LÁMPARA INCANDESCENTE
    else if (comp.type === 'lamp') {
      const R = comp.resistance || 50;
      const P = absI * absI * R;
      html += `
        <div class="step-card">
          <div class="step-num">Bombilla Incandescente</div>
          <div class="step-body">
            <h5>Emisión Lumínica & Potencia Eléctrica</h5>
            <div class="formula-box">
              <div class="formula-line"><span>Tensión aplicada:</span> <strong>${vComp.toFixed(2)} V</strong></div>
              <div class="formula-line"><span>Corriente de filamento:</span> <strong>${(absI * 1000).toFixed(1)} mA</strong></div>
              <div class="formula-rule">Potencia Lumínica y Térmica: <strong>P = I^2 \\cdot R</strong></div>
              <div class="formula-calc">P = (${absI.toFixed(3)}\\text{A})^2 \\cdot (${R}\\Omega) = <strong>${P.toFixed(2)} W</strong></div>
            </div>
            <div class="step-explanation">
              💡 El brillo amarillo en el lienzo es proporcional a la potencia eléctrica disipada en el filamento de tungsteno.
            </div>
          </div>
        </div>
      `;
    }

    // 5. DIODOS & ZENER
    else if (comp.type === 'diode' || comp.type === 'schottky' || comp.type === 'zener' || comp.type === 'led') {
      const vf = comp.type === 'schottky' ? 0.3 : (comp.type === 'led' ? (comp.forwardDrop || 1.8) : 0.7);
      const isConducting = vComp >= (vf - 0.05);

      html += `
        <div class="step-card">
          <div class="step-num">${comp.label || comp.type.toUpperCase()}</div>
          <div class="step-body">
            <h5>Polarización y Umbral de Conducción</h5>
            <div class="formula-box">
              <div class="formula-line"><span>Tensión Ánodo - Cátodo:</span> <strong>${vComp.toFixed(2)} V</strong></div>
              <div class="formula-line"><span>Caída umbral nominal (\(V_f\)):</span> <strong>${vf.toFixed(2)} V</strong></div>
              <div class="formula-rule">Estado actual: <strong>${isConducting ? 'POLARIZACIÓN DIRECTA (Activo)' : 'POLARIZACIÓN INVERSA (Bloqueo)'}</strong></div>
              <div class="formula-calc">Corriente que circula: <strong>${(absI * 1000).toFixed(2)} mA</strong></div>
            </div>
          </div>
        </div>
      `;
    }

    container.innerHTML = html;
  }

  /**
   * Pestaña 3: Reactancias Frecuenciales
   */
  updateReactanceTab(stats) {
    const freq = Math.max(0.1, stats.freq || 50);

    const caps = this.engine.components.filter(c => c.type === 'capacitor');
    const elXc = document.getElementById('xc-calc');
    if (elXc) {
      if (caps.length > 0) {
        const C = caps[0].capacitance || 10e-6;
        const xc = 1 / (2 * Math.PI * freq * C);
        const cMicro = (C * 1e6).toFixed(1);
        elXc.innerHTML = `
          X_C = \\frac{1}{2 \\cdot \\pi \\cdot (${freq.toFixed(1)}\\text{Hz}) \\cdot (${cMicro}\\mu\\text{F})} = <strong>${xc >= 1000 ? (xc / 1000).toFixed(2) + ' k\\Omega' : xc.toFixed(2) + ' \\Omega'}</strong>
          <br><small style="color: #8b9bb4;">A mayor frecuencia f, menor es la oposición capacitiva X_C.</small>
        `;
      } else {
        elXc.innerHTML = `X_C = \\frac{1}{2\\pi f C} (Agrega un capacitor al circuito)`;
      }
    }

    const inds = this.engine.components.filter(c => c.type === 'inductor');
    const elXl = document.getElementById('xl-calc');
    if (elXl) {
      if (inds.length > 0) {
        const L = inds[0].inductance || 100e-3;
        const xl = 2 * Math.PI * freq * L;
        const lMilli = (L * 1000).toFixed(0);
        elXl.innerHTML = `
          X_L = 2 \\cdot \\pi \\cdot (${freq.toFixed(1)}\\text{Hz}) \\cdot (${lMilli}\\text{mH}) = <strong>${xl >= 1000 ? (xl / 1000).toFixed(2) + ' k\\Omega' : xl.toFixed(2) + ' \\Omega'}</strong>
        `;
      } else {
        elXl.innerHTML = `X_L = 2\\pi f L (Agrega un inductor al circuito)`;
      }
    }

    const elZ = document.getElementById('z-calc');
    if (elZ) {
      const res = this.engine.components.find(c => c.type === 'resistor');
      const cap = this.engine.components.find(c => c.type === 'capacitor');
      const ind = this.engine.components.find(c => c.type === 'inductor');

      const R = res ? res.resistance : 0;
      const Xc = cap ? 1 / (2 * Math.PI * freq * cap.capacitance) : 0;
      const Xl = ind ? 2 * Math.PI * freq * ind.inductance : 0;
      const Xnet = Xl - Xc;
      const Z = Math.sqrt(R * R + Xnet * Xnet);
      const phaseRad = Math.atan2(Xnet, R || 1e-6);
      const phaseDeg = phaseRad * (180 / Math.PI);

      if (res || cap || ind) {
        elZ.innerHTML = `
          |Z| = \\sqrt{(${R.toFixed(0)})^2 + (${Xnet.toFixed(1)})^2} = <strong>${Z >= 1000 ? (Z / 1000).toFixed(2) + ' k\\Omega' : Z.toFixed(2) + ' \\Omega'}</strong>
          <br><span>Desfase V-I: <strong>${phaseDeg.toFixed(1)}°</strong> (${phaseDeg > 0 ? 'Inductivo (V adelanta)' : (phaseDeg < 0 ? 'Capacitivo (I adelanta)' : 'En Fase')})</span>
        `;
      }
    }
  }
}

window.MathExplainer = MathExplainer;
