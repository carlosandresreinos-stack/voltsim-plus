/**
 * VoltSim+ Pro - Circuitos Didácticos Preconfigurados (Presets)
 * Diseñados para estudiar cargas máximas/mínimas, constantes de tiempo Tau,
 * rectificación, control de potencia y comportamiento AC/DC.
 */

const PRESET_CIRCUITS = {
  // 1. Carga y Descarga de Capacitor (Cargas Qmax, Qmin, Tau)
  cap_charging: {
    name: 'Carga y Descarga de Capacitor (Qmax, Qmin, Tau)',
    components: [
      { id: 'bat1', type: 'dc_source', x: 180, y: 200, rotation: 90, voltage: 10.0, label: 'Fuente 10V' },
      { id: 'sw1',  type: 'switch', x: 260, y: 130, rotation: 0, closed: true, label: 'SW Carga' },
      { id: 'res1', type: 'resistor', x: 360, y: 130, rotation: 0, resistance: 1000, label: 'R (1kΩ)' },
      { id: 'cap1', type: 'capacitor', x: 460, y: 200, rotation: 90, capacitance: 10e-6, label: 'C (10µF)' },
      { id: 'gnd1', type: 'ground', x: 180, y: 310, rotation: 0, label: 'GND (0V)' },
      { id: 'prb1', type: 'probe', x: 460, y: 110, rotation: 0, label: 'V_Capacitor' }
    ],
    wires: [
      { fromComp: 'bat1', fromPin: 0, toComp: 'sw1', toPin: 0 },
      { fromComp: 'sw1', fromPin: 1, toComp: 'res1', toPin: 0 },
      { fromComp: 'res1', fromPin: 1, toComp: 'cap1', toPin: 0 },
      { fromComp: 'res1', fromPin: 1, toComp: 'prb1', toPin: 0 },
      { fromComp: 'cap1', fromPin: 1, toComp: 'gnd1', toPin: 0 },
      { fromComp: 'bat1', fromPin: 1, toComp: 'gnd1', toPin: 0 }
    ],
    probeCompId: 'prb1'
  },

  // 2. Análisis Señal AC Pura (Vmax, Vmin, Vpp, Vrms, Cargas)
  ac_analysis: {
    name: 'Análisis Señal AC (Vmax, Vmin, Vpp, Vrms)',
    components: [
      { id: 'src1', type: 'ac_source', x: 200, y: 200, rotation: 90, voltagePeak: 10.0, frequency: 50.0, offset: 0.0, label: 'AC (10Vp 50Hz)' },
      { id: 'res1', type: 'resistor', x: 360, y: 200, rotation: 90, resistance: 1000, label: 'R_Carga (1kΩ)' },
      { id: 'gnd1', type: 'ground', x: 200, y: 310, rotation: 0, label: 'GND (0V)' },
      { id: 'prb1', type: 'probe', x: 280, y: 120, rotation: 0, label: 'Sonda CH1' }
    ],
    wires: [
      { fromComp: 'src1', fromPin: 0, toComp: 'prb1', toPin: 0 },
      { fromComp: 'prb1', fromPin: 0, toComp: 'res1', toPin: 0 },
      { fromComp: 'src1', fromPin: 1, toComp: 'gnd1', toPin: 0 },
      { fromComp: 'gnd1', fromPin: 0, toComp: 'res1', toPin: 1 }
    ],
    probeCompId: 'prb1'
  },

  // 3. Señal AC con Offset DC (+4V Continua)
  ac_offset: {
    name: 'Señal AC con Offset DC (+4V Continua)',
    components: [
      { id: 'src1', type: 'ac_source', x: 200, y: 200, rotation: 90, voltagePeak: 6.0, frequency: 50.0, offset: 4.0, label: 'AC (6Vp + 4V Offset)' },
      { id: 'res1', type: 'resistor', x: 360, y: 200, rotation: 90, resistance: 1000, label: 'R (1kΩ)' },
      { id: 'gnd1', type: 'ground', x: 200, y: 310, rotation: 0, label: 'GND' },
      { id: 'prb1', type: 'probe', x: 280, y: 120, rotation: 0, label: 'Sonda CH1' }
    ],
    wires: [
      { fromComp: 'src1', fromPin: 0, toComp: 'prb1', toPin: 0 },
      { fromComp: 'prb1', fromPin: 0, toComp: 'res1', toPin: 0 },
      { fromComp: 'src1', fromPin: 1, toComp: 'gnd1', toPin: 0 },
      { fromComp: 'gnd1', fromPin: 0, toComp: 'res1', toPin: 1 }
    ],
    probeCompId: 'prb1'
  },

  // 4. Divisor de Voltaje y Potenciómetro en Vivo
  voltage_divider: {
    name: 'Divisor de Voltaje con Potenciómetro Regulable',
    components: [
      { id: 'bat1', type: 'dc_source', x: 180, y: 200, rotation: 90, voltage: 12.0, label: 'Fuente 12V' },
      { id: 'pot1', type: 'potentiometer', x: 320, y: 200, rotation: 90, resistance: 10000, wiper: 0.5, label: 'Pot 10k (Wiper 50%)' },
      { id: 'gnd1', type: 'ground', x: 180, y: 320, rotation: 0, label: 'GND' },
      { id: 'prb1', type: 'probe', x: 420, y: 200, rotation: 0, label: 'V_out (Wiper)' }
    ],
    wires: [
      { fromComp: 'bat1', fromPin: 0, toComp: 'pot1', toPin: 0 },
      { fromComp: 'pot1', fromPin: 1, toComp: 'gnd1', toPin: 0 },
      { fromComp: 'pot1', fromPin: 2, toComp: 'prb1', toPin: 0 },
      { fromComp: 'bat1', fromPin: 1, toComp: 'gnd1', toPin: 0 }
    ],
    probeCompId: 'prb1'
  },

  // 5. Rectificador de Onda Completa con Puente de Diodos
  full_bridge: {
    name: 'Rectificador de Onda Completa con Diodos y Filtro C',
    components: [
      { id: 'src1', type: 'ac_source', x: 160, y: 200, rotation: 90, voltagePeak: 12.0, frequency: 50.0, offset: 0.0, label: 'AC (12Vp 50Hz)' },
      { id: 'd1',   type: 'diode', x: 280, y: 140, rotation: 0, label: 'D1' },
      { id: 'd2',   type: 'diode', x: 280, y: 260, rotation: 180, label: 'D2' },
      { id: 'cap1', type: 'capacitor', x: 420, y: 200, rotation: 90, capacitance: 47e-6, label: 'Filtro (47µF)' },
      { id: 'res1', type: 'resistor', x: 500, y: 200, rotation: 90, resistance: 1000, label: 'R_Carga (1kΩ)' },
      { id: 'gnd1', type: 'ground', x: 160, y: 320, rotation: 0, label: 'GND' },
      { id: 'prb1', type: 'probe', x: 420, y: 120, rotation: 0, label: 'V_DC Rectificado' }
    ],
    wires: [
      { fromComp: 'src1', fromPin: 0, toComp: 'd1', toPin: 0 },
      { fromComp: 'd1', fromPin: 1, toComp: 'cap1', toPin: 0 },
      { fromComp: 'd1', fromPin: 1, toComp: 'prb1', toPin: 0 },
      { fromComp: 'cap1', fromPin: 0, toComp: 'res1', toPin: 0 },
      { fromComp: 'cap1', fromPin: 1, toComp: 'gnd1', toPin: 0 },
      { fromComp: 'res1', fromPin: 1, toComp: 'gnd1', toPin: 0 },
      { fromComp: 'src1', fromPin: 1, toComp: 'gnd1', toPin: 0 }
    ],
    probeCompId: 'prb1'
  },

  // 6. Bombilla Incandescente con Potenciómetro (Control de Brillo)
  lamp_dimmer: {
    name: 'Bombilla Incandescente con Potenciómetro',
    components: [
      { id: 'bat1', type: 'dc_source', x: 180, y: 200, rotation: 90, voltage: 12.0, label: 'Batería 12V' },
      { id: 'pot1', type: 'potentiometer', x: 300, y: 140, rotation: 0, resistance: 200, wiper: 0.2, label: 'Dimmer 200Ω' },
      { id: 'lamp1',type: 'lamp', x: 440, y: 200, rotation: 90, resistance: 40, label: 'Bombilla 40Ω' },
      { id: 'gnd1', type: 'ground', x: 180, y: 320, rotation: 0, label: 'GND' },
      { id: 'prb1', type: 'probe', x: 440, y: 120, rotation: 0, label: 'V_Lámpara' }
    ],
    wires: [
      { fromComp: 'bat1', fromPin: 0, toComp: 'pot1', toPin: 0 },
      { fromComp: 'pot1', fromPin: 2, toComp: 'lamp1', toPin: 0 },
      { fromComp: 'lamp1', fromPin: 0, toComp: 'prb1', toPin: 0 },
      { fromComp: 'lamp1', fromPin: 1, toComp: 'gnd1', toPin: 0 },
      { fromComp: 'bat1', fromPin: 1, toComp: 'gnd1', toPin: 0 }
    ],
    probeCompId: 'prb1'
  },

  // 7. Regulador de Voltaje con Diodo Zener (Estabilización 5.1V)
  zener_regulator: {
    name: 'Regulador de Voltaje con Diodo Zener (5.1V)',
    components: [
      { id: 'src1', type: 'ac_source', x: 180, y: 200, rotation: 90, voltagePeak: 12.0, frequency: 50.0, offset: 0.0, label: 'Vin (12Vp)' },
      { id: 'res1', type: 'resistor', x: 300, y: 140, rotation: 0, resistance: 470, label: 'R_Limit (470Ω)' },
      { id: 'zen1', type: 'zener', x: 420, y: 200, rotation: 90, zenerVoltage: 5.1, label: 'Zener 5.1V' },
      { id: 'gnd1', type: 'ground', x: 180, y: 320, rotation: 0, label: 'GND' },
      { id: 'prb1', type: 'probe', x: 420, y: 120, rotation: 0, label: 'V_Regulado (5.1V)' }
    ],
    wires: [
      { fromComp: 'src1', fromPin: 0, toComp: 'res1', toPin: 0 },
      { fromComp: 'res1', fromPin: 1, toComp: 'zen1', toPin: 1 }, // Cátodo hacia arriba para regular en inversa
      { fromComp: 'res1', fromPin: 1, toComp: 'prb1', toPin: 0 },
      { fromComp: 'zen1', fromPin: 0, toComp: 'gnd1', toPin: 0 },
      { fromComp: 'src1', fromPin: 1, toComp: 'gnd1', toPin: 0 }
    ],
    probeCompId: 'prb1'
  },

  // 8. Transistor NPN BJT como Interruptor de Carga
  bjt_switch: {
    name: 'Transistor NPN BJT Conmutando un LED',
    components: [
      { id: 'bat1', type: 'dc_source', x: 160, y: 200, rotation: 90, voltage: 9.0, label: 'Fuente 9V' },
      { id: 'sw1',  type: 'switch', x: 240, y: 130, rotation: 0, closed: true, label: 'Control Base' },
      { id: 'rb1',  type: 'resistor', x: 320, y: 130, rotation: 0, resistance: 4700, label: 'Rb (4.7kΩ)' },
      { id: 'rc1',  type: 'resistor', x: 420, y: 90, rotation: 0, resistance: 330, label: 'Rc (330Ω)' },
      { id: 'led1', type: 'led', x: 420, y: 160, rotation: 90, color: '#00ff88', forwardDrop: 2.2, label: 'LED Verde' },
      { id: 'q1',   type: 'npn', x: 420, y: 250, rotation: 0, beta: 100, label: '2N2222' },
      { id: 'gnd1', type: 'ground', x: 160, y: 330, rotation: 0, label: 'GND' },
      { id: 'prb1', type: 'probe', x: 480, y: 160, rotation: 0, label: 'V_Colector' }
    ],
    wires: [
      { fromComp: 'bat1', fromPin: 0, toComp: 'sw1', toPin: 0 },
      { fromComp: 'sw1', fromPin: 1, toComp: 'rb1', toPin: 0 },
      { fromComp: 'rb1', fromPin: 1, toComp: 'q1', toPin: 1 }, // Base
      { fromComp: 'bat1', fromPin: 0, toComp: 'rc1', toPin: 0 },
      { fromComp: 'rc1', fromPin: 1, toComp: 'led1', toPin: 0 },
      { fromComp: 'led1', fromPin: 1, toComp: 'q1', toPin: 0 }, // Colector
      { fromComp: 'led1', fromPin: 1, toComp: 'prb1', toPin: 0 },
      { fromComp: 'q1', fromPin: 2, toComp: 'gnd1', toPin: 0 },  // Emisor a tierra
      { fromComp: 'bat1', fromPin: 1, toComp: 'gnd1', toPin: 0 }
    ],
    probeCompId: 'prb1'
  },

  // 9. Filtro RC Pasa-Bajos
  rc_filter: {
    name: 'Filtro RC Pasa-Bajos (Reactancia Xc y Corte fc)',
    components: [
      { id: 'src1', type: 'ac_source', x: 180, y: 200, rotation: 90, voltagePeak: 10.0, frequency: 159.0, offset: 0.0, label: 'Vin (10Vp 159Hz)' },
      { id: 'res1', type: 'resistor', x: 300, y: 140, rotation: 0, resistance: 1000, label: 'R (1kΩ)' },
      { id: 'cap1', type: 'capacitor', x: 420, y: 210, rotation: 90, capacitance: 1e-6, label: 'C (1µF)' },
      { id: 'gnd1', type: 'ground', x: 180, y: 320, rotation: 0, label: 'GND' },
      { id: 'prb1', type: 'probe', x: 420, y: 120, rotation: 0, label: 'V_out (Salida Filtrada)' }
    ],
    wires: [
      { fromComp: 'src1', fromPin: 0, toComp: 'res1', toPin: 0 },
      { fromComp: 'res1', fromPin: 1, toComp: 'cap1', toPin: 0 },
      { fromComp: 'res1', fromPin: 1, toComp: 'prb1', toPin: 0 },
      { fromComp: 'cap1', fromPin: 1, toComp: 'gnd1', toPin: 0 },
      { fromComp: 'src1', fromPin: 1, toComp: 'gnd1', toPin: 0 }
    ],
    probeCompId: 'prb1'
  },

  // 10. Circuito RLC (Resonancia, Energía Eléctrica y Magnética)
  rlc_resonance: {
    name: 'Circuito RLC (Resonancia, Energía Ec y El)',
    components: [
      { id: 'src1', type: 'ac_source', x: 180, y: 220, rotation: 90, voltagePeak: 10.0, frequency: 159.0, offset: 0.0, label: 'Vin (159Hz Resonancia)' },
      { id: 'res1', type: 'resistor', x: 280, y: 140, rotation: 0, resistance: 100, label: 'R (100Ω)' },
      { id: 'ind1', type: 'inductor', x: 380, y: 140, rotation: 0, inductance: 100e-3, label: 'L (100mH)' },
      { id: 'cap1', type: 'capacitor', x: 480, y: 220, rotation: 90, capacitance: 10e-6, label: 'C (10µF)' },
      { id: 'gnd1', type: 'ground', x: 180, y: 330, rotation: 0, label: 'GND' },
      { id: 'prb1', type: 'probe', x: 480, y: 120, rotation: 0, label: 'V_C (Resonancia)' }
    ],
    wires: [
      { fromComp: 'src1', fromPin: 0, toComp: 'res1', toPin: 0 },
      { fromComp: 'res1', fromPin: 1, toComp: 'ind1', toPin: 0 },
      { fromComp: 'ind1', fromPin: 1, toComp: 'cap1', toPin: 0 },
      { fromComp: 'ind1', fromPin: 1, toComp: 'prb1', toPin: 0 },
      { fromComp: 'cap1', fromPin: 1, toComp: 'gnd1', toPin: 0 },
      { fromComp: 'src1', fromPin: 1, toComp: 'gnd1', toPin: 0 }
    ],
    probeCompId: 'prb1'
  }
};

window.PRESET_CIRCUITS = PRESET_CIRCUITS;
