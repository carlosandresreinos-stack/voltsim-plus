/**
 * VoltSim+ Pro - Editor Esquemático Interactivo con Inspector en Tiempo Real
 * Soporta selección inmediata, controles deslizantes en vivo para cada componente,
 * cableado magnético por pines, y animación de corriente eléctrica.
 */

class SchematicEditor {
  constructor(canvasId, engine, oscilloscope, mathExplainer) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.engine = engine;
    this.oscilloscope = oscilloscope;
    this.mathExplainer = mathExplainer;

    this.gridSize = 20;
    this.zoom = 1.0;
    this.panX = 80;
    this.panY = 60;

    this.mode = 'select'; // 'select', 'wire', 'place'
    this.placeType = null;
    this.selectedComponent = null;
    this.hoveredPin = null;
    this.wireStartPin = null;

    this.isDraggingComp = false;
    this.dragOffset = { x: 0, y: 0 };
    this.isPanning = false;
    this.panStart = { x: 0, y: 0 };

    this.electronPhase = 0;

    this.initEvents();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const parent = this.canvas.parentElement;
    if (parent) {
      this.canvas.width = parent.clientWidth;
      this.canvas.height = parent.clientHeight;
    }
  }

  snap(val) {
    return Math.round(val / this.gridSize) * this.gridSize;
  }

  screenToWorld(sx, sy) {
    return {
      x: (sx - this.panX) / this.zoom,
      y: (sy - this.panY) / this.zoom
    };
  }

  worldToScreen(wx, wy) {
    return {
      x: wx * this.zoom + this.panX,
      y: wy * this.zoom + this.panY
    };
  }

  initEvents() {
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });

    // Botones superiores de acción en lienzo
    document.getElementById('btn-rotate')?.addEventListener('click', () => this.rotateSelected());
    document.getElementById('btn-delete')?.addEventListener('click', () => this.deleteSelected());
    document.getElementById('btn-center')?.addEventListener('click', () => this.centerView());
    document.getElementById('btn-mode-wire')?.addEventListener('click', () => {
      this.mode = this.mode === 'wire' ? 'select' : 'wire';
      this.updateModeUI();
    });
    document.getElementById('btn-clear')?.addEventListener('click', () => {
      if (confirm('¿Deseas vaciar el lienzo y eliminar todos los componentes?')) {
        this.engine.components = [];
        this.engine.wires = [];
        this.engine.reset();
        this.setSelectedComponent(null);
      }
    });

    // Atajos de teclado
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (e.key === 'r' || e.key === 'R') this.rotateSelected();
      if (e.key === 'Delete' || e.key === 'Backspace') this.deleteSelected();
      if (e.key === 'w' || e.key === 'W') {
        this.mode = this.mode === 'wire' ? 'select' : 'wire';
        this.updateModeUI();
      }
      if (e.key === 'Escape') {
        this.mode = 'select';
        this.placeType = null;
        this.wireStartPin = null;
        this.updateModeUI();
      }
    });
  }

  setPlaceMode(type) {
    this.mode = 'place';
    this.placeType = type;
    this.updateModeUI();
  }

  updateModeUI() {
    const lbl = document.getElementById('current-mode-label');
    const wireBtn = document.getElementById('btn-mode-wire');
    if (wireBtn) wireBtn.classList.toggle('active', this.mode === 'wire');

    if (!lbl) return;
    if (this.mode === 'select') lbl.innerHTML = 'Herramienta: <strong>Seleccionar / Mover</strong>';
    else if (this.mode === 'wire') lbl.innerHTML = 'Herramienta: <strong style="color: var(--accent-cyan)">Modo Cableado (Clic en un terminal)</strong>';
    else if (this.mode === 'place') lbl.innerHTML = `Colocar: <strong style="color: var(--accent-green)">${this.placeType.toUpperCase()}</strong> (Clic en la cuadrícula)`;
  }

  rotateSelected() {
    if (this.selectedComponent) {
      this.selectedComponent.rotation = ((this.selectedComponent.rotation || 0) + 90) % 360;
    }
  }

  deleteSelected() {
    if (this.selectedComponent) {
      this.engine.removeComponent(this.selectedComponent.id);
      this.setSelectedComponent(null);
    }
  }

  centerView() {
    if (this.engine.components.length === 0) {
      this.panX = 80; this.panY = 60; this.zoom = 1.0;
      return;
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const c of this.engine.components) {
      minX = Math.min(minX, c.x);
      minY = Math.min(minY, c.y);
      maxX = Math.max(maxX, c.x);
      maxY = Math.max(maxY, c.y);
    }
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    this.panX = this.canvas.width / 2 - midX * this.zoom;
    this.panY = this.canvas.height / 2 - midY * this.zoom;
  }

  setSelectedComponent(comp) {
    this.selectedComponent = comp;
    this.mathExplainer.setSelectedComponent(comp);
    this.renderInspector(comp);
  }

  /**
   * Inspector de propiedades en tiempo real (Panel derecho superior)
   * Permite editar datos instantáneamente con sliders e inputs numéricos directos.
   */
  renderInspector(comp) {
    const container = document.getElementById('inspector-fields');
    const subtitle = document.getElementById('inspector-comp-name');
    if (!container || !subtitle) return;

    if (!comp) {
      subtitle.textContent = 'Ningún componente seleccionado';
      container.innerHTML = `
        <div class="inspector-empty-tip">
          👉 <strong>Haz clic en cualquier componente</strong> del circuito para modificar sus valores en tiempo real mediante sliders e inputs numéricos directos.
        </div>
      `;
      return;
    }

    subtitle.textContent = `${comp.label || comp.type} (${comp.id})`;
    let html = `
      <div class="insp-row">
        <div class="insp-label"><span>Etiqueta:</span></div>
        <div class="insp-controls">
          <input type="text" id="insp-label" value="${comp.label || ''}" style="width: 100%;">
        </div>
      </div>
    `;

    // 1. FUENTES AC SENOIDAL O TRIANGULAR
    if (comp.type === 'ac_source' || comp.type === 'triangle_source') {
      html += `
        <div class="insp-row">
          <div class="insp-label"><span>Voltaje Pico (Vp):</span> <strong id="lbl-vp">${comp.voltagePeak || 10} V</strong></div>
          <div class="insp-controls">
            <input type="range" id="rng-vp" min="0.5" max="50" step="0.5" value="${comp.voltagePeak || 10}">
            <input type="number" id="num-vp" value="${comp.voltagePeak || 10}" step="0.5">
            <span class="insp-unit">V</span>
          </div>
        </div>
        <div class="insp-row">
          <div class="insp-label"><span>Frecuencia (f):</span> <strong id="lbl-freq">${comp.frequency || 50} Hz</strong></div>
          <div class="insp-controls">
            <input type="range" id="rng-freq" min="1" max="500" step="1" value="${comp.frequency || 50}">
            <input type="number" id="num-freq" value="${comp.frequency || 50}" step="1">
            <span class="insp-unit">Hz</span>
          </div>
        </div>
        <div class="insp-row">
          <div class="insp-label"><span>Offset DC (Continua):</span> <strong id="lbl-off">${comp.offset || 0} V</strong></div>
          <div class="insp-controls">
            <input type="range" id="rng-off" min="-20" max="20" step="0.5" value="${comp.offset || 0}">
            <input type="number" id="num-off" value="${comp.offset || 0}" step="0.5">
            <span class="insp-unit">V</span>
          </div>
        </div>
      `;
    }

    // 2. FUENTE DC
    else if (comp.type === 'dc_source') {
      html += `
        <div class="insp-row">
          <div class="insp-label"><span>Voltaje DC:</span> <strong id="lbl-vdc">${comp.voltage || 10} V</strong></div>
          <div class="insp-controls">
            <input type="range" id="rng-vdc" min="0.5" max="60" step="0.5" value="${comp.voltage || 10}">
            <input type="number" id="num-vdc" value="${comp.voltage || 10}" step="0.5">
            <span class="insp-unit">V</span>
          </div>
        </div>
      `;
    }

    // 3. GENERADOR DE PULSO / ONDA CUADRADA
    else if (comp.type === 'pulse_source') {
      html += `
        <div class="insp-row">
          <div class="insp-label"><span>Voltaje Alto (V_high):</span> <strong id="lbl-vhigh">${comp.vHigh || 5} V</strong></div>
          <div class="insp-controls">
            <input type="range" id="rng-vhigh" min="0.5" max="30" step="0.5" value="${comp.vHigh || 5}">
            <input type="number" id="num-vhigh" value="${comp.vHigh || 5}" step="0.5">
            <span class="insp-unit">V</span>
          </div>
        </div>
        <div class="insp-row">
          <div class="insp-label"><span>Frecuencia:</span> <strong id="lbl-pfreq">${comp.frequency || 50} Hz</strong></div>
          <div class="insp-controls">
            <input type="range" id="rng-pfreq" min="1" max="500" step="1" value="${comp.frequency || 50}">
            <input type="number" id="num-pfreq" value="${comp.frequency || 50}" step="1">
            <span class="insp-unit">Hz</span>
          </div>
        </div>
        <div class="insp-row">
          <div class="insp-label"><span>Ciclo de Trabajo (Duty):</span> <strong id="lbl-duty">${comp.dutyCycle || 50} %</strong></div>
          <div class="insp-controls">
            <input type="range" id="rng-duty" min="5" max="95" step="5" value="${comp.dutyCycle || 50}">
            <span class="insp-unit">%</span>
          </div>
        </div>
      `;
    }

    // 4. RESISTENCIA & LÁMPARA
    else if (comp.type === 'resistor' || comp.type === 'lamp') {
      html += `
        <div class="insp-row">
          <div class="insp-label"><span>Resistencia (R):</span> <strong id="lbl-res">${comp.resistance || 1000} Ω</strong></div>
          <div class="insp-controls">
            <input type="range" id="rng-res" min="10" max="50000" step="10" value="${comp.resistance || 1000}">
            <input type="number" id="num-res" value="${comp.resistance || 1000}" step="10">
            <span class="insp-unit">Ω</span>
          </div>
        </div>
      `;
    }

    // 5. POTENCIÓMETRO
    else if (comp.type === 'potentiometer') {
      const wiperPct = Math.round((comp.wiper !== undefined ? comp.wiper : 0.5) * 100);
      html += `
        <div class="insp-row">
          <div class="insp-label"><span>Posición del Cursor (Wiper):</span> <strong id="lbl-wiper">${wiperPct} %</strong></div>
          <div class="insp-controls">
            <input type="range" id="rng-wiper" min="1" max="99" step="1" value="${wiperPct}">
            <span class="insp-unit">%</span>
          </div>
        </div>
        <div class="insp-row">
          <div class="insp-label"><span>Resistencia Total:</span> <strong id="lbl-potres">${comp.resistance || 10000} Ω</strong></div>
          <div class="insp-controls">
            <input type="number" id="num-potres" value="${comp.resistance || 10000}" step="500">
            <span class="insp-unit">Ω</span>
          </div>
        </div>
      `;
    }

    // 6. CAPACITOR
    else if (comp.type === 'capacitor') {
      const capMicro = ((comp.capacitance || 10e-6) * 1e6).toFixed(1);
      html += `
        <div class="insp-row">
          <div class="insp-label"><span>Capacitancia (C):</span> <strong id="lbl-cap">${capMicro} µF</strong></div>
          <div class="insp-controls">
            <input type="range" id="rng-cap" min="0.1" max="200" step="0.5" value="${capMicro}">
            <input type="number" id="num-cap" value="${capMicro}" step="0.5">
            <span class="insp-unit">µF</span>
          </div>
        </div>
      `;
    }

    // 7. INDUCTOR
    else if (comp.type === 'inductor') {
      const indMilli = ((comp.inductance || 100e-3) * 1e3).toFixed(0);
      html += `
        <div class="insp-row">
          <div class="insp-label"><span>Inductancia (L):</span> <strong id="lbl-ind">${indMilli} mH</strong></div>
          <div class="insp-controls">
            <input type="range" id="rng-ind" min="1" max="1000" step="5" value="${indMilli}">
            <input type="number" id="num-ind" value="${indMilli}" step="5">
            <span class="insp-unit">mH</span>
          </div>
        </div>
      `;
    }

    // 8. LED
    else if (comp.type === 'led') {
      html += `
        <div class="insp-row">
          <div class="insp-label"><span>Color del LED:</span></div>
          <div class="insp-controls">
            <select id="sel-led-color" style="width: 100%;">
              <option value="#ff0055" ${comp.color === '#ff0055' ? 'selected' : ''}>Rojo (Vf = 1.8V)</option>
              <option value="#00ff88" ${comp.color === '#00ff88' ? 'selected' : ''}>Verde (Vf = 2.2V)</option>
              <option value="#00d4ff" ${comp.color === '#00d4ff' ? 'selected' : ''}>Azul (Vf = 3.2V)</option>
              <option value="#ffd166" ${comp.color === '#ffd166' ? 'selected' : ''}>Amarillo (Vf = 2.0V)</option>
            </select>
          </div>
        </div>
      `;
    }

    // 9. DIODO ZENER
    else if (comp.type === 'zener') {
      html += `
        <div class="insp-row">
          <div class="insp-label"><span>Voltaje Zener (Vz):</span> <strong id="lbl-vz">${comp.zenerVoltage || 5.1} V</strong></div>
          <div class="insp-controls">
            <select id="sel-vz" style="width: 100%;">
              <option value="3.3" ${comp.zenerVoltage === 3.3 ? 'selected' : ''}>3.3 V</option>
              <option value="5.1" ${comp.zenerVoltage === 5.1 ? 'selected' : ''}>5.1 V (Típico)</option>
              <option value="9.1" ${comp.zenerVoltage === 9.1 ? 'selected' : ''}>9.1 V</option>
              <option value="12.0" ${comp.zenerVoltage === 12.0 ? 'selected' : ''}>12.0 V</option>
            </select>
          </div>
        </div>
      `;
    }

    // Botones rápidos de control
    html += `
      <div class="insp-actions">
        <button id="btn-insp-rot" class="btn btn-tiny btn-secondary">🔄 Rotar</button>
        <button id="btn-insp-del" class="btn btn-tiny btn-secondary" style="color: var(--accent-red)">🗑️ Eliminar</button>
      </div>
    `;

    container.innerHTML = html;

    // Vincular Eventos en Vivo
    const bindSync = (rngId, numId, lblId, unit, setter) => {
      const rng = document.getElementById(rngId);
      const num = document.getElementById(numId);
      const lbl = document.getElementById(lblId);

      const updateVal = (val) => {
        setter(val);
        if (rng) rng.value = val;
        if (num) num.value = val;
        if (lbl) lbl.textContent = `${val} ${unit}`;
        this.mathExplainer.update(performance.now() + 1000);
      };

      rng?.addEventListener('input', (e) => updateVal(parseFloat(e.target.value)));
      num?.addEventListener('input', (e) => updateVal(parseFloat(e.target.value) || 0));
    };

    document.getElementById('insp-label')?.addEventListener('input', (e) => {
      comp.label = e.target.value;
    });

    if (comp.type === 'ac_source' || comp.type === 'triangle_source') {
      bindSync('rng-vp', 'num-vp', 'lbl-vp', 'V', v => comp.voltagePeak = v);
      bindSync('rng-freq', 'num-freq', 'lbl-freq', 'Hz', v => comp.frequency = v);
      bindSync('rng-off', 'num-off', 'lbl-off', 'V', v => comp.offset = v);
    } else if (comp.type === 'dc_source') {
      bindSync('rng-vdc', 'num-vdc', 'lbl-vdc', 'V', v => comp.voltage = v);
    } else if (comp.type === 'pulse_source') {
      bindSync('rng-vhigh', 'num-vhigh', 'lbl-vhigh', 'V', v => comp.vHigh = v);
      bindSync('rng-pfreq', 'num-pfreq', 'lbl-pfreq', 'Hz', v => comp.frequency = v);
      document.getElementById('rng-duty')?.addEventListener('input', (e) => {
        comp.dutyCycle = parseFloat(e.target.value);
        document.getElementById('lbl-duty').textContent = `${comp.dutyCycle} %`;
      });
    } else if (comp.type === 'resistor' || comp.type === 'lamp') {
      bindSync('rng-res', 'num-res', 'lbl-res', 'Ω', v => comp.resistance = v);
    } else if (comp.type === 'potentiometer') {
      document.getElementById('rng-wiper')?.addEventListener('input', (e) => {
        const pct = parseFloat(e.target.value);
        comp.wiper = pct / 100;
        document.getElementById('lbl-wiper').textContent = `${pct} %`;
      });
      document.getElementById('num-potres')?.addEventListener('input', (e) => {
        comp.resistance = Math.max(10, parseFloat(e.target.value) || 1000);
        document.getElementById('lbl-potres').textContent = `${comp.resistance} Ω`;
      });
    } else if (comp.type === 'capacitor') {
      bindSync('rng-cap', 'num-cap', 'lbl-cap', 'µF', v => comp.capacitance = v * 1e-6);
    } else if (comp.type === 'inductor') {
      bindSync('rng-ind', 'num-ind', 'lbl-ind', 'mH', v => comp.inductance = v * 1e-3);
    } else if (comp.type === 'led') {
      document.getElementById('sel-led-color')?.addEventListener('change', (e) => {
        comp.color = e.target.value;
        if (comp.color === '#ff0055') comp.forwardDrop = 1.8;
        else if (comp.color === '#00ff88') comp.forwardDrop = 2.2;
        else if (comp.color === '#00d4ff') comp.forwardDrop = 3.2;
        else comp.forwardDrop = 2.0;
      });
    } else if (comp.type === 'zener') {
      document.getElementById('sel-vz')?.addEventListener('change', (e) => {
        comp.zenerVoltage = parseFloat(e.target.value);
        document.getElementById('lbl-vz').textContent = `${comp.zenerVoltage} V`;
      });
    }

    document.getElementById('btn-insp-rot')?.addEventListener('click', () => this.rotateSelected());
    document.getElementById('btn-insp-del')?.addEventListener('click', () => this.deleteSelected());
  }

  onMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const wpos = this.screenToWorld(sx, sy);

    if (e.button === 1 || e.shiftKey) {
      this.isPanning = true;
      this.panStart = { x: sx - this.panX, y: sy - this.panY };
      return;
    }

    if (this.mode === 'place' && this.placeType) {
      const snapX = this.snap(wpos.x);
      const snapY = this.snap(wpos.y);
      this.createComponent(this.placeType, snapX, snapY);
      this.mode = 'select';
      this.placeType = null;
      this.updateModeUI();
      return;
    }

    // Clic en terminal de conexión
    const clickedPin = this.findPinAt(wpos.x, wpos.y);
    if (clickedPin) {
      if (!this.wireStartPin) {
        this.wireStartPin = clickedPin;
      } else {
        if (this.wireStartPin.comp.id !== clickedPin.comp.id || this.wireStartPin.pinIdx !== clickedPin.pinIdx) {
          this.engine.addWire(this.wireStartPin.comp.id, this.wireStartPin.pinIdx, clickedPin.comp.id, clickedPin.pinIdx);
        }
        this.wireStartPin = null;
      }
      return;
    }

    // Clic en componente
    const comp = this.findComponentAt(wpos.x, wpos.y);
    if (comp) {
      if (comp.type === 'switch') {
        comp.closed = !comp.closed;
      } else if (comp.type === 'push_button') {
        comp.pressed = true;
      }

      // Si es sonda, activar canal en osciloscopio
      if (comp.type === 'probe') {
        const n = this.engine.getNodeForPin(comp.id, 0);
        this.oscilloscope.setActiveNode(n, comp.label || 'Sonda CH1');
      } else if (comp.type === 'probe_ch2') {
        const n = this.engine.getNodeForPin(comp.id, 0);
        this.oscilloscope.setCh2Node(n, comp.label || 'Sonda CH2');
      }

      this.setSelectedComponent(comp);
      this.isDraggingComp = true;
      this.dragOffset = { x: wpos.x - comp.x, y: wpos.y - comp.y };
    } else {
      this.setSelectedComponent(null);
      this.wireStartPin = null;
      this.isPanning = true;
      this.panStart = { x: sx - this.panX, y: sy - this.panY };
    }
  }

  onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const wpos = this.screenToWorld(sx, sy);
    this.mouseWorld = wpos;

    if (this.isPanning) {
      this.panX = sx - this.panStart.x;
      this.panY = sy - this.panStart.y;
      return;
    }

    if (this.isDraggingComp && this.selectedComponent) {
      this.selectedComponent.x = this.snap(wpos.x - this.dragOffset.x);
      this.selectedComponent.y = this.snap(wpos.y - this.dragOffset.y);
      return;
    }

    this.hoveredPin = this.findPinAt(wpos.x, wpos.y);
  }

  onMouseUp(e) {
    if (this.selectedComponent && this.selectedComponent.type === 'push_button') {
      this.selectedComponent.pressed = false;
    }
    this.isPanning = false;
    this.isDraggingComp = false;
  }

  onWheel(e) {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newZoom = Math.max(0.4, Math.min(2.5, this.zoom * zoomFactor));
    this.panX = mouseX - (mouseX - this.panX) * (newZoom / this.zoom);
    this.panY = mouseY - (mouseY - this.panY) * (newZoom / this.zoom);
    this.zoom = newZoom;
  }

  createComponent(type, x, y) {
    const comp = {
      id: 'c_' + Math.random().toString(36).substr(2, 8),
      type,
      x,
      y,
      rotation: 0,
      label: type.toUpperCase(),
      pinCount: 2
    };

    switch (type) {
      case 'ac_source':
        comp.voltagePeak = 10.0;
        comp.frequency = 50.0;
        comp.offset = 0.0;
        comp.label = 'V_AC 10Vp 50Hz';
        break;
      case 'triangle_source':
        comp.voltagePeak = 10.0;
        comp.frequency = 50.0;
        comp.offset = 0.0;
        comp.label = 'V_Triang 10Vp';
        break;
      case 'pulse_source':
        comp.vHigh = 5.0;
        comp.vLow = 0.0;
        comp.frequency = 50.0;
        comp.dutyCycle = 50;
        comp.label = 'Pulso 5V 50Hz';
        break;
      case 'dc_source':
        comp.voltage = 12.0;
        comp.label = 'Fuente 12V';
        break;
      case 'resistor':
        comp.resistance = 1000;
        comp.label = '1kΩ';
        break;
      case 'lamp':
        comp.resistance = 50;
        comp.label = 'Bombilla 50Ω';
        break;
      case 'potentiometer':
        comp.resistance = 10000;
        comp.wiper = 0.5;
        comp.pinCount = 3;
        comp.label = 'Pot 10kΩ';
        break;
      case 'capacitor':
        comp.capacitance = 10e-6;
        comp.label = '10µF';
        break;
      case 'inductor':
        comp.inductance = 100e-3;
        comp.label = '100mH';
        break;
      case 'diode':
        comp.label = '1N4007';
        break;
      case 'schottky':
        comp.label = 'Schottky 0.3V';
        break;
      case 'zener':
        comp.zenerVoltage = 5.1;
        comp.label = 'Zener 5.1V';
        break;
      case 'led':
        comp.color = '#ff0055';
        comp.forwardDrop = 1.8;
        comp.label = 'LED Rojo';
        break;
      case 'npn':
        comp.pinCount = 3;
        comp.beta = 100;
        comp.label = '2N2222 NPN';
        break;
      case 'pnp':
        comp.pinCount = 3;
        comp.beta = 100;
        comp.label = '2N2907 PNP';
        break;
      case 'opamp':
        comp.pinCount = 3;
        comp.railVoltage = 15.0;
        comp.label = 'LM741';
        break;
      case 'switch':
        comp.closed = true;
        comp.label = 'SW';
        break;
      case 'push_button':
        comp.pressed = false;
        comp.label = 'Pulsador';
        break;
      case 'ground':
        comp.pinCount = 1;
        comp.label = 'GND';
        break;
      case 'probe':
        comp.pinCount = 1;
        comp.label = 'Sonda CH1';
        break;
      case 'probe_ch2':
        comp.pinCount = 1;
        comp.label = 'Sonda CH2';
        break;
    }

    this.engine.addComponent(comp);
    this.setSelectedComponent(comp);
    return comp;
  }

  getComponentPinCoords(comp) {
    const rad = (comp.rotation || 0) * (Math.PI / 180);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const rot = (px, py) => ({
      x: comp.x + (px * cos - py * sin),
      y: comp.y + (px * sin + py * cos)
    });

    if (comp.type === 'ground' || comp.type === 'probe' || comp.type === 'probe_ch2') {
      return [rot(0, -20)];
    } else if (comp.type === 'potentiometer') {
      return [rot(-30, 0), rot(30, 0), rot(0, 20)];
    } else if (comp.type === 'opamp') {
      return [rot(-40, -15), rot(-40, 15), rot(40, 0)];
    } else if (comp.type === 'npn' || comp.type === 'pnp') {
      return [rot(20, -20), rot(-20, 0), rot(20, 20)]; // C, B, E
    } else {
      return [rot(-30, 0), rot(30, 0)];
    }
  }

  findPinAt(wx, wy) {
    const threshold = 12 / this.zoom;
    for (const comp of this.engine.components) {
      const pins = this.getComponentPinCoords(comp);
      for (let i = 0; i < pins.length; i++) {
        const p = pins[i];
        if (Math.hypot(p.x - wx, p.y - wy) <= threshold) {
          return { comp, pinIdx: i, x: p.x, y: p.y };
        }
      }
    }
    return null;
  }

  findComponentAt(wx, wy) {
    const hitRadius = 28;
    for (let i = this.engine.components.length - 1; i >= 0; i--) {
      const c = this.engine.components[i];
      if (Math.hypot(c.x - wx, c.y - wy) <= hitRadius) return c;
    }
    return null;
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (w <= 0 || h <= 0) return;

    ctx.clearRect(0, 0, w, h);

    // 1. Cuadrícula
    ctx.save();
    ctx.fillStyle = '#162232';
    const startW = this.screenToWorld(0, 0);
    const endW = this.screenToWorld(w, h);
    const startX = Math.floor(startW.x / this.gridSize) * this.gridSize;
    const startY = Math.floor(startW.y / this.gridSize) * this.gridSize;

    for (let x = startX; x <= endW.x; x += this.gridSize) {
      for (let y = startY; y <= endW.y; y += this.gridSize) {
        const sp = this.worldToScreen(x, y);
        ctx.fillRect(sp.x - 1, sp.y - 1, 2, 2);
      }
    }
    ctx.restore();

    ctx.save();
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.zoom, this.zoom);

    // 2. Cables con animación de corriente eléctrica en tiempo real
    this.electronPhase += 0.08 * this.engine.speedMultiplier;
    for (const wire of this.engine.wires) {
      const c1 = this.engine.components.find(c => c.id === wire.fromComp);
      const c2 = this.engine.components.find(c => c.id === wire.toComp);
      if (!c1 || !c2) continue;

      const p1 = this.getComponentPinCoords(c1)[wire.fromPin];
      const p2 = this.getComponentPinCoords(c2)[wire.toPin];
      if (!p1 || !p2) continue;

      const n1 = this.engine.getNodeForPin(wire.fromComp, wire.fromPin);
      const v = this.engine.nodeVoltages.get(n1) || 0;

      ctx.beginPath();
      ctx.lineWidth = 2.4;
      if (Math.abs(v) < 0.1) ctx.strokeStyle = '#415266';
      else if (v > 0) ctx.strokeStyle = '#00d4ff';
      else ctx.strokeStyle = '#ff758f';

      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      if (dist > 10 && this.engine.isRunning) {
        const numDots = Math.floor(dist / 22);
        ctx.fillStyle = '#00ff88';
        for (let d = 0; d < numDots; d++) {
          const ratio = (d / numDots + this.electronPhase) % 1.0;
          ctx.beginPath();
          ctx.arc(p1.x + (p2.x - p1.x) * ratio, p1.y + (p2.y - p1.y) * ratio, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    if (this.wireStartPin && this.mouseWorld) {
      ctx.beginPath();
      ctx.strokeStyle = '#ffd000';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.moveTo(this.wireStartPin.x, this.wireStartPin.y);
      ctx.lineTo(this.mouseWorld.x, this.mouseWorld.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 3. Dibujar Componentes
    for (const comp of this.engine.components) {
      this.drawComponent(ctx, comp);
    }

    // 4. Pines interactivos
    for (const comp of this.engine.components) {
      const pins = this.getComponentPinCoords(comp);
      for (let i = 0; i < pins.length; i++) {
        const p = pins[i];
        const isHovered = this.hoveredPin && this.hoveredPin.comp.id === comp.id && this.hoveredPin.pinIdx === i;
        ctx.beginPath();
        ctx.arc(p.x, p.y, isHovered ? 5.5 : 3.5, 0, Math.PI * 2);
        ctx.fillStyle = isHovered ? '#00ff88' : '#27384a';
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 1.5;
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  drawComponent(ctx, comp) {
    ctx.save();
    ctx.translate(comp.x, comp.y);
    ctx.rotate((comp.rotation || 0) * (Math.PI / 180));

    const isSelected = this.selectedComponent && this.selectedComponent.id === comp.id;
    if (isSelected) {
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.6)';
      ctx.lineWidth = 2;
      ctx.strokeRect(-36, -26, 72, 52);
    }

    ctx.strokeStyle = '#e6edf3';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#141e2a';

    switch (comp.type) {
      case 'resistor':
        ctx.beginPath();
        ctx.moveTo(-30, 0); ctx.lineTo(-18, 0);
        ctx.moveTo(18, 0);  ctx.lineTo(30, 0);
        ctx.stroke();
        ctx.fillRect(-18, -9, 36, 18);
        ctx.strokeRect(-18, -9, 36, 18);
        break;

      case 'lamp':
        ctx.beginPath();
        ctx.moveTo(-30, 0); ctx.lineTo(-14, 0);
        ctx.moveTo(14, 0);  ctx.lineTo(30, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        const iLamp = Math.abs(this.engine.branchCurrents.get(comp.id) || 0);
        const pLamp = iLamp * iLamp * (comp.resistance || 50);
        ctx.fillStyle = pLamp > 0.1 ? `rgba(255, 209, 102, ${Math.min(1, 0.2 + pLamp * 0.5)})` : '#16202c';
        ctx.fill();
        ctx.stroke();
        // Filamento en X
        ctx.beginPath();
        ctx.moveTo(-7, -7); ctx.lineTo(7, 7);
        ctx.moveTo(-7, 7);  ctx.lineTo(7, -7);
        ctx.stroke();
        break;

      case 'potentiometer':
        ctx.beginPath();
        ctx.moveTo(-30, 0); ctx.lineTo(-18, 0);
        ctx.moveTo(18, 0);  ctx.lineTo(30, 0);
        ctx.moveTo(0, 9);   ctx.lineTo(0, 20);
        ctx.stroke();
        ctx.fillRect(-18, -9, 36, 18);
        ctx.strokeRect(-18, -9, 36, 18);
        // Flecha del cursor (wiper)
        const wiperX = -14 + 28 * (comp.wiper !== undefined ? comp.wiper : 0.5);
        ctx.beginPath();
        ctx.strokeStyle = '#ffb703';
        ctx.moveTo(0, 16); ctx.lineTo(wiperX, 4);
        ctx.stroke();
        break;

      case 'capacitor':
        ctx.beginPath();
        ctx.moveTo(-30, 0); ctx.lineTo(-6, 0);
        ctx.moveTo(6, 0);   ctx.lineTo(30, 0);
        ctx.moveTo(-6, -16); ctx.lineTo(-6, 16);
        ctx.moveTo(6, -16);  ctx.lineTo(6, 16);
        ctx.stroke();
        break;

      case 'inductor':
        ctx.beginPath();
        ctx.moveTo(-30, 0); ctx.lineTo(-18, 0);
        ctx.moveTo(18, 0);  ctx.lineTo(30, 0);
        ctx.stroke();
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(-12 + i * 12, 0, 6, Math.PI, 0, false);
          ctx.stroke();
        }
        break;

      case 'ac_source':
        ctx.beginPath();
        ctx.moveTo(-30, 0); ctx.lineTo(-18, 0);
        ctx.moveTo(18, 0);  ctx.lineTo(30, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.beginPath();
        ctx.strokeStyle = '#00d4ff';
        ctx.moveTo(-8, 0);
        ctx.bezierCurveTo(-4, -10, 0, -10, 0, 0);
        ctx.bezierCurveTo(0, 10, 4, 10, 8, 0);
        ctx.stroke();
        break;

      case 'triangle_source':
        ctx.beginPath();
        ctx.moveTo(-30, 0); ctx.lineTo(-18, 0);
        ctx.moveTo(18, 0);  ctx.lineTo(30, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.beginPath();
        ctx.strokeStyle = '#e76f51';
        ctx.moveTo(-10, 6); ctx.lineTo(0, -8); ctx.lineTo(10, 6);
        ctx.stroke();
        break;

      case 'pulse_source':
        ctx.beginPath();
        ctx.moveTo(-30, 0); ctx.lineTo(-18, 0);
        ctx.moveTo(18, 0);  ctx.lineTo(30, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.beginPath();
        ctx.strokeStyle = '#fb8500';
        ctx.moveTo(-10, 6); ctx.lineTo(-10, -6); ctx.lineTo(0, -6); ctx.lineTo(0, 6); ctx.lineTo(10, 6);
        ctx.stroke();
        break;

      case 'dc_source':
        ctx.beginPath();
        ctx.moveTo(-30, 0); ctx.lineTo(-8, 0);
        ctx.moveTo(8, 0);   ctx.lineTo(30, 0);
        ctx.moveTo(-8, -16); ctx.lineTo(-8, 16);
        ctx.moveTo(8, -8);   ctx.lineTo(8, 8);
        ctx.stroke();
        ctx.fillStyle = '#ffb703';
        ctx.font = 'bold 12px Inter';
        ctx.fillText('+', -20, -8);
        break;

      case 'ground':
        ctx.beginPath();
        ctx.moveTo(0, -20); ctx.lineTo(0, 0);
        ctx.moveTo(-16, 0); ctx.lineTo(16, 0);
        ctx.moveTo(-10, 6); ctx.lineTo(10, 6);
        ctx.moveTo(-4, 12); ctx.lineTo(4, 12);
        ctx.stroke();
        break;

      case 'diode':
      case 'schottky':
        ctx.beginPath();
        ctx.moveTo(-30, 0); ctx.lineTo(-12, 0);
        ctx.moveTo(12, 0);  ctx.lineTo(30, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-12, -12); ctx.lineTo(12, 0); ctx.lineTo(-12, 12);
        ctx.closePath();
        ctx.fillStyle = comp.type === 'schottky' ? '#52b788' : '#00ff88';
        ctx.fill(); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(12, -12); ctx.lineTo(12, 12);
        if (comp.type === 'schottky') {
          ctx.moveTo(8, -12); ctx.lineTo(12, -12);
          ctx.moveTo(12, 12); ctx.lineTo(16, 12);
        }
        ctx.stroke();
        break;

      case 'zener':
        ctx.beginPath();
        ctx.moveTo(-30, 0); ctx.lineTo(-12, 0);
        ctx.moveTo(12, 0);  ctx.lineTo(30, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-12, -12); ctx.lineTo(12, 0); ctx.lineTo(-12, 12);
        ctx.closePath();
        ctx.fillStyle = '#9d4edd';
        ctx.fill(); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(12, -12); ctx.lineTo(12, 12);
        ctx.moveTo(12, -12); ctx.lineTo(7, -15);
        ctx.moveTo(12, 12);  ctx.lineTo(17, 15);
        ctx.stroke();
        break;

      case 'led':
        ctx.beginPath();
        ctx.moveTo(-30, 0); ctx.lineTo(-12, 0);
        ctx.moveTo(12, 0);  ctx.lineTo(30, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-12, -12); ctx.lineTo(12, 0); ctx.lineTo(-12, 12);
        ctx.closePath();
        const iLed = this.engine.branchCurrents.get(comp.id) || 0;
        const isLedOn = iLed > 0.003;
        ctx.fillStyle = isLedOn ? (comp.color || '#ff0055') : '#3d1620';
        ctx.fill(); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(12, -12); ctx.lineTo(12, 12);
        ctx.stroke();
        if (isLedOn) {
          ctx.strokeStyle = comp.color || '#ff0055';
          ctx.beginPath();
          ctx.moveTo(4, -14); ctx.lineTo(14, -24);
          ctx.moveTo(10, -14); ctx.lineTo(20, -24);
          ctx.stroke();
        }
        break;

      case 'switch':
        ctx.beginPath();
        ctx.moveTo(-30, 0); ctx.lineTo(-12, 0);
        ctx.moveTo(12, 0);  ctx.lineTo(30, 0);
        ctx.arc(-12, 0, 3, 0, Math.PI * 2);
        ctx.arc(12, 0, 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.strokeStyle = comp.closed ? '#00ff88' : '#ff4d6d';
        ctx.lineWidth = 2.5;
        if (comp.closed) {
          ctx.moveTo(-12, 0); ctx.lineTo(12, 0);
        } else {
          ctx.moveTo(-12, 0); ctx.lineTo(8, -14);
        }
        ctx.stroke();
        break;

      case 'push_button':
        ctx.beginPath();
        ctx.moveTo(-30, 0); ctx.lineTo(-10, 0);
        ctx.moveTo(10, 0);  ctx.lineTo(30, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.strokeStyle = comp.pressed ? '#00ff88' : '#f72585';
        ctx.lineWidth = 2.5;
        const pushY = comp.pressed ? 0 : -8;
        ctx.moveTo(-14, pushY); ctx.lineTo(14, pushY);
        ctx.moveTo(0, pushY);   ctx.lineTo(0, pushY - 8);
        ctx.stroke();
        break;

      case 'probe':
      case 'probe_ch2':
        const isCh2 = comp.type === 'probe_ch2';
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fillStyle = isCh2 ? '#ffb703' : '#00d4ff';
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = 'bold 10px Fira Code';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isCh2 ? 'CH2' : 'CH1', 0, 0);
        ctx.beginPath();
        ctx.strokeStyle = isCh2 ? '#ffb703' : '#00d4ff';
        ctx.moveTo(0, -14); ctx.lineTo(0, -20);
        ctx.stroke();
        break;

      case 'opamp':
        ctx.beginPath();
        ctx.moveTo(-40, -30); ctx.lineTo(40, 0); ctx.lineTo(-40, 30);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#00d4ff';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('+', -34, -10);
        ctx.fillText('−', -34, 18);
        break;
    }

    ctx.restore();
    ctx.save();
    ctx.translate(comp.x, comp.y);
    ctx.fillStyle = '#8b9bb4';
    ctx.font = '11px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(comp.label || '', 0, 32);
    ctx.restore();
  }
}

window.SchematicEditor = SchematicEditor;
