/**
 * VoltSim+ Pro - Controlador Principal de la Aplicación
 * Conecta el motor matricial SPICE, el osciloscopio en tiempo real,
 * el inspector interactivo de datos y el analizador de cargas y magnitudes.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Inicializar Módulos Centrales
  const engine = new CircuitEngine();
  const oscilloscope = new Oscilloscope('scope-canvas', engine);
  const mathExplainer = new MathExplainer(engine, oscilloscope);
  const schematic = new SchematicEditor('circuit-canvas', engine, oscilloscope, mathExplainer);

  // 2. Cargar circuito predeterminado (Carga y Descarga de Capacitor)
  loadPreset('cap_charging');

  // 3. Bucle de Simulación a 60 FPS en Tiempo Real
  let lastTimestamp = performance.now();

  function mainLoop(timestamp) {
    const elapsed = Math.min(0.05, (timestamp - lastTimestamp) / 1000);
    lastTimestamp = timestamp;

    if (engine.isRunning) {
      // Sub-pasos temporales para alta precisión numérica
      const subSteps = 30;
      const dt = (0.0004 * engine.speedMultiplier) / subSteps;
      for (let i = 0; i < subSteps; i++) {
        engine.stepSimulation(dt);
      }
    }

    // Renderizar lienzo y osciloscopio
    schematic.render();
    if (!oscilloscope.isFrozen) {
      oscilloscope.render();
    }
    mathExplainer.update(timestamp);

    requestAnimationFrame(mainLoop);
  }

  requestAnimationFrame(mainLoop);

  // 4. Selector de Circuitos Didácticos
  const presetSelect = document.getElementById('preset-select');
  if (presetSelect) {
    presetSelect.addEventListener('change', (e) => {
      const key = e.target.value;
      if (key && PRESET_CIRCUITS[key]) {
        loadPreset(key);
      }
    });
  }

  function loadPreset(key) {
    const preset = PRESET_CIRCUITS[key];
    if (!preset) return;

    engine.components = JSON.parse(JSON.stringify(preset.components));
    engine.wires = JSON.parse(JSON.stringify(preset.wires));
    engine.reset();

    // Resolver un paso para asociar pines y nodos
    engine.stepSimulation(0.0001);

    // Conectar sonda preconfigurada al osciloscopio
    if (preset.probeCompId) {
      const probeComp = engine.components.find(c => c.id === preset.probeCompId);
      if (probeComp) {
        const nodeId = engine.getNodeForPin(probeComp.id, 0);
        oscilloscope.setActiveNode(nodeId, probeComp.label || 'Sonda Principal');
      }
    }

    setTimeout(() => {
      oscilloscope.autoScale();
      schematic.centerView();
      // Seleccionar automáticamente el primer componente relevante para el inspector
      const firstActive = engine.components.find(c => c.type === 'capacitor' || c.type === 'ac_source' || c.type === 'potentiometer' || c.type === 'resistor');
      if (firstActive) {
        schematic.setSelectedComponent(firstActive);
      }
      mathExplainer.update(performance.now() + 500);
    }, 120);
  }

  // 5. Paleta de Componentes (Colocar con 1 Clic)
  document.querySelectorAll('.comp-tool').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-type');
      document.querySelectorAll('.comp-tool').forEach(b => b.classList.remove('active-tool'));
      btn.classList.add('active-tool');
      schematic.setPlaceMode(type);
    });
  });

  // 6. Controles de Simulación Superiores
  const btnToggleSim = document.getElementById('btn-toggle-sim');
  if (btnToggleSim) {
    btnToggleSim.addEventListener('click', () => {
      engine.isRunning = !engine.isRunning;
      const icon = btnToggleSim.querySelector('.icon');
      const label = btnToggleSim.querySelector('.label');
      if (engine.isRunning) {
        if (icon) icon.textContent = '⏸';
        if (label) label.textContent = 'Pausar';
        btnToggleSim.classList.remove('btn-secondary');
        btnToggleSim.classList.add('btn-primary');
      } else {
        if (icon) icon.textContent = '▶';
        if (label) label.textContent = 'Reanudar';
        btnToggleSim.classList.remove('btn-primary');
        btnToggleSim.classList.add('btn-secondary');
      }
    });
  }

  // Barra espaciadora para pausar/reanudar
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') {
      e.preventDefault();
      btnToggleSim?.click();
    }
  });

  document.getElementById('btn-reset-sim')?.addEventListener('click', () => {
    engine.reset();
    oscilloscope.autoScale();
  });

  // Control deslizante de velocidad
  const speedSlider = document.getElementById('sim-speed');
  const speedVal = document.getElementById('speed-val');
  if (speedSlider && speedVal) {
    speedSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      engine.speedMultiplier = val;
      speedVal.textContent = `${val.toFixed(1)}x`;
    });
  }

  // 7. Controles del Osciloscopio en Tiempo Real
  const scaleY = document.getElementById('scope-scale-y');
  const scaleYVal = document.getElementById('scope-scale-y-val');
  scaleY?.addEventListener('input', (e) => {
    oscilloscope.voltPerDiv = parseFloat(e.target.value);
    if (scaleYVal) scaleYVal.textContent = `${oscilloscope.voltPerDiv.toFixed(1)} V`;
    oscilloscope.updateHUD();
  });

  const scaleX = document.getElementById('scope-scale-x');
  const scaleXVal = document.getElementById('scope-scale-x-val');
  scaleX?.addEventListener('input', (e) => {
    oscilloscope.timePerDiv = parseFloat(e.target.value) / 1000;
    if (scaleXVal) scaleXVal.textContent = `${(oscilloscope.timePerDiv * 1000).toFixed(1)} ms`;
    oscilloscope.updateHUD();
  });

  const offsetY = document.getElementById('scope-offset-y');
  const offsetYVal = document.getElementById('scope-offset-y-val');
  offsetY?.addEventListener('input', (e) => {
    oscilloscope.offsetY = parseFloat(e.target.value);
    if (offsetYVal) offsetYVal.textContent = `${oscilloscope.offsetY.toFixed(1)} V`;
  });

  document.getElementById('btn-scope-auto')?.addEventListener('click', () => {
    oscilloscope.autoScale();
  });

  document.getElementById('btn-scope-pause')?.addEventListener('click', (e) => {
    oscilloscope.isFrozen = !oscilloscope.isFrozen;
    e.target.textContent = oscilloscope.isFrozen ? '▶ Reanudar' : '⏸ Congelar';
  });

  // 8. Pestañas del Panel de Cálculos
  document.querySelectorAll('.math-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.math-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const paneId = tab.getAttribute('data-tab');
      const targetPane = document.getElementById(paneId);
      if (targetPane) targetPane.classList.add('active');
    });
  });

  // Contraer / Expandir Panel Derecho
  const detailsPanel = document.getElementById('details-panel');
  const btnCollapseDetails = document.getElementById('btn-collapse-details');
  btnCollapseDetails?.addEventListener('click', () => {
    detailsPanel.classList.toggle('collapsed');
    btnCollapseDetails.textContent = detailsPanel.classList.contains('collapsed') ? '❮' : '❯';
    setTimeout(() => {
      schematic.resize();
      oscilloscope.resize();
    }, 220);
  });

  // 9. Generar Reporte / Imprimir PDF
  document.getElementById('btn-print-report')?.addEventListener('click', () => {
    window.print();
  });

  // 10. Modal de Ayuda
  const helpModal = document.getElementById('help-modal');
  document.getElementById('btn-help')?.addEventListener('click', () => {
    helpModal?.classList.add('show');
  });
  document.getElementById('btn-close-help')?.addEventListener('click', () => {
    helpModal?.classList.remove('show');
  });
  helpModal?.addEventListener('click', (e) => {
    if (e.target === helpModal) helpModal.classList.remove('show');
  });
});
