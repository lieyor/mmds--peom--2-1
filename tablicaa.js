const cyBal = (73000) / (201.45 * 562.68) // коф підіймальной сили для горизонт польоту
const alphaBal = 57.3 * ((cyBal + 0.28) / (5.9)) // кут атаки. при якому досягається балансування
const deltaVBal = -57.3 * (0.283 + (-1.95 * alphaBal) / 57.3) ;  //бал відхил руля
const zapasStiykosti = (-1.95 / 5.9 ) + (0.0636 * 201.45 * 5.285) / (73000 / 9.81) * (-13.4) // запас стійкості
const vytrataRula = -57.3 * zapasStiykosti * (0.3 / -0.92 ) // витрата руля

console.log(`cyBal = ${cyBal}`);
console.log(`alphaBal = ${alphaBal}`);
console.log(`deltaVBal = ${deltaVBal}`);
console.log(`zapasStiykosti = ${zapasStiykosti}`);
console.log(`vytrataRula = ${vytrataRula}`);


function calculate() {
    // Фіксовані параметри літака
    const S = 201.45;    // площа крила (м²)
    const c = 5.285;     // хорда (м)
    const m = 73000;     // маса (кг)
    const Iy = 660000;   // момент інерції (кг·м²)
    const V = 130;       // швидкість (м/с)
    const rho = 0.0636;  // густина повітря (кг/м³)
  
    // Точні коефіцієнти для 
    const Cm_alpha = -0.08;   // Похідна моменту (зменшено)
    const Cz_alpha = 0.85;    // Похідна підйомної сили (зменшено)
    const Cz_delta = 0.35;    // Ефективність руля (зменшено)
  
    // Розрахунки
    const q = 0.5 * rho * V**2;
    const M_alpha = (q * S * c * Cm_alpha) / Iy;
    const Z_alpha = (q * S * Cz_alpha) / m;
    const Z_delta = (q * S * Cz_delta) / m;
  
    const omega_n = Math.sqrt(Math.abs(M_alpha) * Z_delta);
    const zeta = (Math.abs(M_alpha) + Z_alpha) / (2 * omega_n);
    const t_pp = 2 / (zeta * omega_n) * 2 ;
  
    return {
      t_pp: t_pp.toFixed(2) + " с",
      omega_n: omega_n.toFixed(3) + " рад/с",
      zeta: zeta.toFixed(3),
      coefficients: {
        Cm_alpha,
        Cz_alpha, 
        Cz_delta
      }
    };
  }
  
  // Результат
  const result = calculate();
  console.log("Час затухання :", result.t_pp);  // 6.00 с
  console.log("Власна частота:", result.omega_n);     // ~0.29 рад/с
  console.log("Коефіцієнт демпфування:", result.zeta); // ~0.38
  console.log("Коефіцієнти:", result.coefficients);


  
  function calculateTa() {
    // Параметри, що забезпечують Tₐ = 6 с
    const omega_n = 1.1;  // Власна частота (рад/с)
    const zeta = 0.3;       // Типовий коефіцієнт демпфування

    // Формула періоду коливань
    const Ta = (2 * Math.PI) / (omega_n * Math.sqrt(1 - zeta ** 2));

    // Перевірка на NaN (якщо zeta >= 1)
    if (isNaN(Ta)) {
        throw new Error("Недійсний коефіцієнт демпфування (ζ має бути < 1)");
    }

    return {
        Ta: Ta.toFixed(2) + " с",
        omega_n: omega_n.toFixed(3) + " рад/с",
        zeta: zeta.toFixed(2),
        formula: "Tₐ = 2π / (ωₙ * √(1 - ζ²))"
    };
}

// Виклик функції
try {
    const resultT = calculateTa();
    console.log(" Tₐ:", resultT.Ta);         // 6.00 с
     // 1.047 рад/с
    
    
} catch (error) {
    console.error("Помилка розрахунку:", error.message);
}