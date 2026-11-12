# VoltSim+ Pro (Versión Mejorada) ⚡
### Simulador de Circuitos en Tiempo Real con Inspector Directo & Calculadora Analítica de Cargas

**VoltSim+ Pro** ha sido mejorado para solucionar exactamente los puntos que solicitaste:
1. **Editor de datos en vivo (Live Inspector)**: Ya no requieres cuadros de diálogo engorrosos. Al hacer un solo clic sobre cualquier componente, aparece en el panel superior derecho un inspector interactivo con **deslizadores (sliders) e inputs numéricos** que modifican en tiempo real la resistencia, capacitancia, inductancia, voltaje pico, frecuencia, offset DC, color de LED o posición del potenciómetro.
2. **Gráfica permanente y en tiempo real**: El osciloscopio digital está **siempre visible** en la parte inferior de la pantalla. Responde a 60 FPS en vivo según el comportamiento del circuito, mostrando líneas guía horizontales para $V_{max}$, $V_{min}$ y nivel medio $V_{dc}$, con soporte para dos canales simultáneos (CH1 Cian y CH2 Amarillo).
3. **Catálogo ampliado de componentes (+20 opciones)**:
   * **Fuentes**: AC Senoidal, DC Batería, Onda Triangular / Rampa, Pulsos / Cuadrada, Masa / GND.
   * **Pasivos**: Resistencias, Potenciómetros con cursor ajustable en vivo, Capacitores, Inductores.
   * **Semiconductores**: Diodo rectificador 1N4007, Diodo Schottky (0.3V), Diodo Zener (3.3V, 5.1V, 9.1V, 12V), Transistores BJT NPN y PNP, Amplificadores Operacionales LM741.
   * **Cargas & Iluminación**: LEDs en 4 colores interactivos con halo de luz en tiempo real, Bombillas incandescentes cuyo filamento brilla según la potencia térmica $P = I^2 R$.
   * **Control & Medición**: Interruptor SPST, Pulsador momentáneo, Sonda CH1 y Sonda CH2.
4. **Desglose analítico detallado de cargas máximas, mínimas y energías**:
   * **Carga eléctrica máxima en placas**: $Q_{max} = C \cdot |V_{max}|$ (en microculombios $\mu\text{C}$ y culombios C).
   * **Carga mínima**: $Q_{min} = C \cdot |V_{min}|$.
   * **Carga transferida por ciclo**: $\Delta Q = C \cdot V_{pp}$.
   * **Energía electrostática acumulada**: $E_C = \frac{1}{2} C (V_{max})^2$ (en milijoules mJ).
   * **Energía magnética en bobinas**: $E_L = \frac{1}{2} L (I_{max})^2$.
   * **Constante de tiempo capacitiva**: $\tau = R \cdot C$ y tiempo de carga completa $t_{5\tau} = 5\tau$.
   * **Valores de onda**: $V_{max}, V_{min}, V_{pp}, V_{dc}, V_p, V_{rms}$, frecuencia $f$, periodo $T$ y pulsación $\omega$.

---

## 🚀 Cómo Iniciar la Aplicación

1. Dirígete a la carpeta:
   ```
   C:\Users\USUARIO1\.gemini\antigravity\scratch\voltsim-plus
   ```
2. Haz **doble clic en `index.html`** para abrirla en tu navegador preferido (Chrome, Edge, Firefox, Brave).
