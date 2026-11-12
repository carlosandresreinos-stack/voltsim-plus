/**
 * VoltSim+ Pro - Osciloscopio Digital de Doble Canal en Tiempo Real
 * Muestra CH1 (Cian) y CH2 (Amarillo) en tiempo real con líneas de nivel
 * para Vmax, Vmin, Vdc y retícula graduada.
 */

class Oscilloscope {
  constructor(canvasId, engine) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.engine = engine;

    this.activeNodeId = 1;      // CH1
    this.ch2NodeId = 0;         // CH2
    this.activeNodeName = 'Sonda CH1';
    this.ch2NodeName = 'Sonda CH2';

    // Parámetros
    this.voltPerDiv = 2.0;
    this.voltPerDivCh2 = 2.0;
    this.timePerDiv = 0.002;    // 2ms / div
    this.offsetY = 0.0;
    this.isFrozen = false;

    this.numDivsX = 10;
    this.numDivsY = 8;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
    }
  }

  setActiveNode(nodeId, name = null) {
    this.activeNodeId = nodeId;
    this.activeNodeName = name || `Nodo ${nodeId}`;
    const badge = document.getElementById('badge-ch1');
    if (badge) badge.textContent = `CH1: ${this.activeNodeName}`;
  }

  setCh2Node(nodeId, name = null) {
    this.ch2NodeId = nodeId;
    this.ch2NodeName = name || `Nodo ${nodeId}`;
    const badge = document.getElementById('badge-ch2');
    if (badge) badge.textContent = `CH2: ${this.ch2NodeName}`;
  }

  autoScale() {
    const hist = this.engine.nodeHistories.get(this.activeNodeId);
    if (!hist || hist.length < 5) return;

    let vMax = -Infinity, vMin = Infinity;
    for (const pt of hist) {
      if (pt.v > vMax) vMax = pt.v;
      if (pt.v < vMin) vMin = pt.v;
    }

    const vRange = Math.max(0.2, vMax - vMin);
    const idealVDiv = vRange / 5;
    const vSteps = [0.1, 0.2, 0.5, 1.0, 2.0, 5.0, 10.0, 20.0, 50.0];
    this.voltPerDiv = vSteps.find(s => s >= idealVDiv) || 10.0;
    this.offsetY = (vMax + vMin) / 2;

    const scaleYEl = document.getElementById('scope-scale-y');
    const scaleYVal = document.getElementById('scope-scale-y-val');
    const offsetYEl = document.getElementById('scope-offset-y');
    const offsetYVal = document.getElementById('scope-offset-y-val');

    if (scaleYEl) scaleYEl.value = this.voltPerDiv;
    if (scaleYVal) scaleYVal.textContent = `${this.voltPerDiv.toFixed(1)} V`;
    if (offsetYEl) offsetYEl.value = this.offsetY;
    if (offsetYVal) offsetYVal.textContent = `${this.offsetY.toFixed(1)} V`;

    this.updateHUD();
  }

  updateHUD() {
    const hudScaleY = document.getElementById('hud-scale-y');
    const hudScaleY2 = document.getElementById('hud-scale-y2');
    const hudScaleX = document.getElementById('hud-scale-x');
    if (hudScaleY) hudScaleY.textContent = `${this.voltPerDiv.toFixed(1)} V/div`;
    if (hudScaleY2) hudScaleY2.textContent = `${this.voltPerDiv.toFixed(1)} V/div`;
    if (hudScaleX) hudScaleX.textContent = `${(this.timePerDiv * 1000).toFixed(1)} ms/div`;
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (w <= 0 || h <= 0) return;

    // 1. Fondo Oscuro de pantalla de fósforo
    ctx.fillStyle = '#020509';
    ctx.fillRect(0, 0, w, h);

    // 2. Retícula
    ctx.strokeStyle = '#0d1e2d';
    ctx.lineWidth = 1;

    const dx = w / this.numDivsX;
    const dy = h / this.numDivsY;

    for (let i = 0; i <= this.numDivsX; i++) {
      const x = i * dx;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    for (let j = 0; j <= this.numDivsY; j++) {
      const y = j * dy;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Ejes centrales con mayor contraste
    ctx.strokeStyle = '#183850';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h);
    ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
    ctx.stroke();

    const centerY = h / 2;
    const pixelsPerVolt = dy / this.voltPerDiv;
    const totalTimeSpan = this.timePerDiv * this.numDivsX;

    // 3. Dibujar CH2 (Amarillo) si está activo
    if (this.ch2NodeId > 0) {
      const hist2 = this.engine.nodeHistories.get(this.ch2NodeId);
      if (hist2 && hist2.length >= 2) {
        this.drawTrace(ctx, hist2, w, centerY, pixelsPerVolt, totalTimeSpan, '#ffb703', false);
      }
    }

    // 4. Dibujar CH1 (Cian)
    const hist1 = this.engine.nodeHistories.get(this.activeNodeId);
    if (hist1 && hist1.length >= 2) {
      this.drawTrace(ctx, hist1, w, centerY, pixelsPerVolt, totalTimeSpan, '#00d4ff', true);

      // Líneas horizontales de Vmax y Vmin
      const stats = this.engine.getSignalStats(this.activeNodeId);
      const yMax = centerY - (stats.vMax - this.offsetY) * pixelsPerVolt;
      const yMin = centerY - (stats.vMin - this.offsetY) * pixelsPerVolt;
      const yDc  = centerY - (stats.vDc - this.offsetY) * pixelsPerVolt;

      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;

      // Línea Vmax
      if (yMax >= 0 && yMax <= h) {
        ctx.strokeStyle = 'rgba(0, 255, 136, 0.45)';
        ctx.beginPath();
        ctx.moveTo(0, yMax); ctx.lineTo(w, yMax);
        ctx.stroke();
        ctx.fillStyle = '#00ff88';
        ctx.font = '10px monospace';
        ctx.fillText(`Vmax: ${stats.vMax.toFixed(2)}V`, 10, yMax - 4);
      }

      // Línea Vmin
      if (yMin >= 0 && yMin <= h) {
        ctx.strokeStyle = 'rgba(255, 77, 109, 0.45)';
        ctx.beginPath();
        ctx.moveTo(0, yMin); ctx.lineTo(w, yMin);
        ctx.stroke();
        ctx.fillStyle = '#ff4d6d';
        ctx.font = '10px monospace';
        ctx.fillText(`Vmin: ${stats.vMin.toFixed(2)}V`, 10, yMin + 12);
      }

      // Línea Vdc
      if (yDc >= 0 && yDc <= h && Math.abs(stats.vDc) > 0.1) {
        ctx.strokeStyle = 'rgba(255, 183, 3, 0.4)';
        ctx.beginPath();
        ctx.moveTo(0, yDc); ctx.lineTo(w, yDc);
        ctx.stroke();
        ctx.fillStyle = '#ffb703';
        ctx.font = '10px monospace';
        ctx.fillText(`Offset: ${stats.vDc.toFixed(2)}V`, w - 90, yDc - 4);
      }
      ctx.restore();

      this.updateMiniStats(stats);
    }
  }

  drawTrace(ctx, hist, w, centerY, pixelsPerVolt, totalTimeSpan, color, isGlow) {
    const latestTime = hist[hist.length - 1].t;
    const startTime = latestTime - totalTimeSpan;

    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.2;
    if (isGlow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
    }
    ctx.lineJoin = 'round';

    let first = true;
    for (let i = 0; i < hist.length; i++) {
      const pt = hist[i];
      if (pt.t < startTime) continue;

      const normX = (pt.t - startTime) / totalTimeSpan;
      const x = normX * w;
      const y = centerY - (pt.v - this.offsetY) * pixelsPerVolt;

      if (first) {
        ctx.moveTo(x, y);
        first = false;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  updateMiniStats(stats) {
    const elVmax = document.getElementById('mini-vmax');
    const elVmin = document.getElementById('mini-vmin');
    const elVpp = document.getElementById('mini-vpp');
    const elVrms = document.getElementById('mini-vrms');
    const elFreq = document.getElementById('mini-freq');

    if (elVmax) elVmax.textContent = `${stats.vMax >= 0 ? '+' : ''}${stats.vMax.toFixed(2)} V`;
    if (elVmin) elVmin.textContent = `${stats.vMin >= 0 ? '+' : ''}${stats.vMin.toFixed(2)} V`;
    if (elVpp) elVpp.textContent = `${stats.vPp.toFixed(2)} V`;
    if (elVrms) elVrms.textContent = `${stats.vRms.toFixed(2)} V`;
    if (elFreq) elFreq.textContent = stats.freq > 0 ? `${stats.freq.toFixed(1)} Hz` : '-- Hz';
  }
}

window.Oscilloscope = Oscilloscope;
