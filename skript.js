document.addEventListener('DOMContentLoaded', function() {
    // Параметри літака 
    const vmas = [
        201.45,   // площа крила
        5.285,    // середня аеродинамічна хорда
        73000,    // взлітна вага
        0.24,     // центр тяжіння
        660000,   // Поздовжній момент інерції, параметри польоту та аеродинамічні характеристики літака
        190.0,    // V0
        6400,     // H0
        0.0636,   // ρ густина
        314.34,   // aн
        9.81,     // g сила тяжіння
        -0.280,   // Cy0
        5.90,     // c^a_y
        0.2865,   // c^б_y
        0.033,    // Cx
        0.22,     // mz0
        -13.4,
        -4.0,
        -1.95,
        -0.92
    ];

    // X[0] = Y[1]; // тангаж
    // X[1] = -C[1] * Y[1] - C[2] * Y[3] - C[5] * X[3] - C[3] * DV; // кутова шв
    // X[2] = C[4] * Y[3] + C[6] * DV; //нахил траєкт
    // X[3] = X[0] - X[2]; // кут атаки
    // NY = C[7] * X[2];// верт перенав

        // ІНІЦІЛІЗАЦІЯ ЗМІННИХ
    let NY = 0; // Вертикальне навантаження 

    let DV, DVS = -2, DVD, KS = 0.112, Kwz = 1, Twz = 0.7, XV = 17.86;
    // DV — змінна (неініціалізована), можливо, означає швидкість або зсув
    // DVS = -2 — відхил руля вісоті
    // DVD — демфер
    // KS = 0.112 — коефіцієнт жорсткості або стабілізації
    // Kwz = 1 — коефіцієнт впливу, , у керуванні
    // Twz = 0.7 — часова константа або затримка
    // XV = 17.86 — значення, ймовірно, координата або змінна для розрахунків (наприклад, швидкість чи відстань)

    const step = 0.01; // Крок інтегрування або оновлення (часовий або просторовий інтервал)
    
    // ВИБІР ЗАКОНУ ПРО УПРАВЛІННЯ
    let selectedControlLaw = 1; // За замовчуванням вибрано І закон керування
    
    // ФУНКЦІЯ ДЛЯ РОЗРАХУНКУ DVD НА ОСНОВІ ОБРАНОГО ЗАКОНУ КЕРУВАННЯ
    function calculateDVD(Y) {
        if (selectedControlLaw === 1) {
            return 0; // І закон: демпфер вимкнено (немає впливу)
        } else if (selectedControlLaw === 2) {
            return Kwz * Y[1]; // ІІ закон: демпфер увімкнено, враховується перша координата Y
        } else {
            return Kwz * Y[1] - Y[4] / Twz; // ІІІ закон: демпфер увімкнено, враховується Y[1] та швидкість зміни (Y[4]) з часом затухання Twz
        }
    }
    // ІНІЦІЛІЗАЦІЯ ДІАГРАМИ 
    const ctx = document.getElementById('dynamicsChart').getContext('2d'); 
    // Отримуємо контекст 2D-графіки з елементу <canvas> з id='dynamicsChart'

    const chart = new Chart(ctx, { // Створюємо нову лінійну діаграму за допомогою бібліотеки Chart.js
        type: 'line', // Тип діаграми — лінійна
        data: {
            labels: [], // Порожній масив для міток по осі X (зазвичай це час)
            datasets: [ // Масив графіків, які будуть виводитися
                {
                    label: 'Кут тангажу', // Назва графіка
                    data: [], // Дані для графіка (заповнюються динамічно)
                    borderColor: 'rgb(75, 192, 192)', // Колір лінії
                    tension: 0.1, // Згладжування лінії
                    hidden: false // Цей графік видно за замовчуванням
                },
                {
                    label: 'Кут нахилу траєкторії',
                    data: [],
                    borderColor: 'rgb(255, 99, 132)',
                    tension: 0.1,
                    hidden: true // Цей графік спочатку прихований
                },
                {
                    label: 'Кут атаки',
                    data: [],
                    borderColor: 'rgb(54, 162, 235)',
                    tension: 0.1,
                    hidden: true
                },
                {
                    label: 'Верт. перенавантаж',
                    data: [],
                    borderColor: 'rgb(153, 102, 255)',
                    tension: 0.1,
                    hidden: true
                }
            ]
        },
        options: {
            responsive: true, // Графік автоматично підлаштовується під розмір контейнера
            scales: {
                x: {
                    type: 'linear', // <--- обязательно указать type: 'linear'
                    title: {
                        display: true,
                        text: 'Time (s)'
                    },
                    min: 0, // если нужно от 0
                    ticks: {
                        stepSize: 0.5 // теперь будет правильно каждые 0.5
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Value' // Назва осі Y — Значення
                    },
                   

                }
            }
        }
    });

    // ОЧИЩЕННЯ ГРАФИКА / КОЕФІЦІЄНТІВ / ДАННА ЧАСУ ТА ЗНАЧЕННЯ
    function clearData() {
        chart.data.labels = []; 
        // Очищаємо мітки по осі X (тобто час) на графіку

        chart.data.datasets.forEach(dataset => {
            dataset.data = [];
        });
        // Проходимося по кожному графіку (dataset) та очищаємо його дані

        chart.update(); 
        // Оновлюємо графік після очищення, щоб зміни були видимі

        const tableBody = document.querySelector('#dataGrid tbody'); 
        // Отримуємо тіло таблиці з ID "dataGrid", щоб очистити з неї дані

        tableBody.innerHTML = ''; 
        // Видаляємо всі рядки з таблиці (результати попередньої симуляції)

        const coefficientsContainer = document.getElementById('coefficients'); 
        // Отримуємо контейнер, у якому показуються коефіцієнти (параметри керування)

        coefficientsContainer.innerHTML = ''; 
        // Очищаємо цей контейнер від попередніх значень
    }
        
    // ПОКАЗ ГРАФІКУ
    function displayCoefficients(C, balanced) {
        const coefficientsContainer = document.getElementById('coefficients');
        coefficientsContainer.innerHTML = '';
        // Знаходимо HTML-елемент, де будуть показуватись коефіцієнти, і очищаємо його
        
        // показ С кофф
        for (let i = 1; i < 17; i++) {
            if (C[i] !== 0 || i === 16) {
                const coefElem = document.createElement('div');
                coefElem.className = 'coefficient';
                
                const labelElem = document.createElement('div');
                labelElem.className = 'coefficient-label';
                labelElem.textContent = `C[${i}]`;
                
                const valueElem = document.createElement('div');
                valueElem.className = 'coefficient-value';
                valueElem.textContent = C[i].toExponential(6);
                
                coefElem.appendChild(labelElem);
                coefElem.appendChild(valueElem);
                coefficientsContainer.appendChild(coefElem);
            }
        }
        
        // показ балансов зна
        if (balanced) {
            const { c_ybal, a_bal, D_bal } = balanced;
            
            // c_ybal
            const c_ybalElem = document.createElement('div');
            c_ybalElem.className = 'coefficient';
            
            const c_ybalLabelElem = document.createElement('div');
            c_ybalLabelElem.className = 'coefficient-label';
            c_ybalLabelElem.textContent = 'c_ybal';
            
            const c_ybalValueElem = document.createElement('div');
            c_ybalValueElem.className = 'coefficient-value';
            c_ybalValueElem.textContent = c_ybal.toExponential(6);
            
            c_ybalElem.appendChild(c_ybalLabelElem);
            c_ybalElem.appendChild(c_ybalValueElem);
            coefficientsContainer.appendChild(c_ybalElem);
            
            // a_bal
            const a_balElem = document.createElement('div');
            a_balElem.className = 'coefficient';
            
            const a_balLabelElem = document.createElement('div');
            a_balLabelElem.className = 'coefficient-label';
            a_balLabelElem.textContent = 'a_bal';
            
            const a_balValueElem = document.createElement('div');
            a_balValueElem.className = 'coefficient-value';
            a_balValueElem.textContent = a_bal.toExponential(6);
            
            a_balElem.appendChild(a_balLabelElem);
            a_balElem.appendChild(a_balValueElem);
            coefficientsContainer.appendChild(a_balElem);
            
            // D_bal
            const D_balElem = document.createElement('div');
            D_balElem.className = 'coefficient';
            
            const D_balLabelElem = document.createElement('div');
            D_balLabelElem.className = 'coefficient-label';
            D_balLabelElem.textContent = 'D_bal';
            
            const D_balValueElem = document.createElement('div');
            D_balValueElem.className = 'coefficient-value';
            D_balValueElem.textContent = D_bal.toExponential(6);
            
            D_balElem.appendChild(D_balLabelElem);
            D_balElem.appendChild(D_balValueElem);
            coefficientsContainer.appendChild(D_balElem);
        }
    }

    // онов сітки даніх
    function updateDataGrid(timeValues, dataValues, maxRows = 15) {
        const tableBody = document.querySelector('#dataGrid tbody');
        tableBody.innerHTML = '';
        
        // Відображати тільки до maxRows рядків
        const numRows = Math.min(timeValues.length, maxRows);
        
        for (let i = 0; i < numRows; i++) {
            const row = document.createElement('tr');
            
            const timeCell = document.createElement('td');
            timeCell.textContent = timeValues[i].toFixed(2) + 's';
            
            const valueCell = document.createElement('td');
            valueCell.textContent = dataValues[i].toFixed(6);
            
            row.appendChild(timeCell);
            row.appendChild(valueCell);
            tableBody.appendChild(row);
        }
    }

    // розрох кут тангажу
    function calculatePitchAngle() {
        clearData();
        
        // кут тангажу / прихов інш
        chart.data.datasets.forEach((dataset, i) => {
            dataset.hidden = (i !== 0);
        });
        
        const m = vmas[2] / vmas[9];
        const C = new Array(17).fill(0);
        
        // розр кофф
        C[1] = -(vmas[15] / vmas[4]) * vmas[0] * Math.pow(vmas[1], 2) * ((vmas[7] * vmas[5]) / 2);
        C[2] = -(vmas[17] / vmas[4]) * vmas[0] * vmas[1] * ((vmas[7] * Math.pow(vmas[5], 2)) / 2);
        C[3] = -(vmas[18] / vmas[4]) * vmas[0] * vmas[1] * ((vmas[7] * Math.pow(vmas[5], 2)) / 2);
        C[4] = ((vmas[11] + vmas[13]) / m) * vmas[0] * ((vmas[7] * vmas[5]) / 2);
        C[5] = -(vmas[16] / vmas[4]) * vmas[0] * Math.pow(vmas[1], 2) * ((vmas[7] * vmas[5]) / 2);
        C[6] = (vmas[12] / m) * vmas[0] * ((vmas[7] * vmas[5]) / 2);
        C[7] = vmas[5] / (m * vmas[9]);
        
        // ініт Х та У
        const X = [0, 0, 0, 0, 0];
        const Y = [0, 0, 0, 0, 0];
        
        // розр баланс кофф
        const c_ybal = (2 * vmas[2]) / (vmas[0] * vmas[7] * Math.pow(vmas[5], 2));
        const a_bal = 57.3 * ((c_ybal - vmas[10]) / vmas[11]);
        const D_bal = -57.3 * (((vmas[14] + vmas[17] * a_bal) / 57.3) + (c_ybal * (vmas[3] - 0.24))) / vmas[18];
        
        // цикл симуляции
        let T = 0;
        const DT = step;
        const timeValues = [];
        const pitchAngles = [];
        
        while (T < 20.001) {
            DVD = calculateDVD(Y);
            X[4] = DVD;
            DV = DVS + DVD;
            
            // розр Х
            X[0] = Y[1];
            X[1] = -C[1] * Y[1] - C[2] * Y[3] - C[5] * X[3] - C[3] * DV;
            X[2] = C[4] * Y[3] + C[6] * DV;
            X[3] = X[0] - X[2];
            NY = C[7] * X[2];
            
            // метод ейлера розр У 
            for (let i = 0; i < 5; i++) {
                Y[i] = Y[i] + X[i] * DT;
            }
            
            // додав даніх до граф та сітки
            timeValues.push(T);
            pitchAngles.push(Y[0]);
            
            // дод до граф
            chart.data.labels.push(T.toFixed(2));
            chart.data.datasets[0].data.push(Y[0]);
            
            T += DT;
        }
        
        chart.update();
        updateDataGrid(timeValues, pitchAngles);
        displayCoefficients(C, { c_ybal, a_bal, D_bal });
    }

    // розр кут нах траек
    function calculateVerticalVelocity() {
        clearData();
        
        // показ кут нах трае  / прихов інш
        chart.data.datasets.forEach((dataset, i) => {
            dataset.hidden = (i !== 1);
        });
        
        const m = vmas[2] / vmas[9];
        const C = new Array(17).fill(0);
        
        // розр коф
        C[1] = -(vmas[15] / vmas[4]) * vmas[0] * Math.pow(vmas[1], 2) * ((vmas[7] * vmas[5]) / 2);
        C[2] = -(vmas[17] / vmas[4]) * vmas[0] * vmas[1] * ((vmas[7] * Math.pow(vmas[5], 2)) / 2);
        C[3] = -(vmas[18] / vmas[4]) * vmas[0] * vmas[1] * ((vmas[7] * Math.pow(vmas[5], 2)) / 2);
        C[4] = ((vmas[11] + vmas[13]) / m) * vmas[0] * ((vmas[7] * vmas[5]) / 2);
        C[5] = -(vmas[16] / vmas[4]) * vmas[0] * Math.pow(vmas[1], 2) * ((vmas[7] * vmas[5]) / 2);
        C[6] = (vmas[12] / m) * vmas[0] * ((vmas[7] * vmas[5]) / 2);
        C[7] = vmas[5] / (m * vmas[9]);
        
        // поч Х та У кофф
        const X = [0, 0, 0, 0, 0];
        const Y = [0, 0, 0, 0, 0];
        
        // розр баланс кофф
        const c_ybal = (2 * vmas[2]) / (vmas[0] * vmas[7] * Math.pow(vmas[5], 2));
        const a_bal = 57.3 * ((c_ybal - vmas[10]) / vmas[11]);
        const D_bal = -57.3 * (((vmas[14] + vmas[17] * a_bal) / 57.3) + (c_ybal * (vmas[3] - 0.24))) / vmas[18];
        
        // цикл симул
        let T = 0;
        const DT = step;
        const timeValues = [];
        const verticalVelocities = [];
        
        while (T < 20.001) {
            DVD = calculateDVD(Y);
            X[4] = DVD;
            DV = DVS + DVD;
            
            // розр Х
            X[0] = Y[1]; // тангаж
            X[1] = -C[1] * Y[1] - C[2] * Y[3] - C[5] * X[3] - C[3] * DV; // кутова шв
            X[2] = C[4] * Y[3] + C[6] * DV; //нахил траєкт
            X[3] = X[0] - X[2]; // кут атаки
            NY = C[7] * X[2];// верт перенав
            
            // метод Ейлера розр У
            for (let i = 0; i < 5; i++) {
                Y[i] = Y[i] + X[i] * DT;
            }
            
            // дод даніе до граф та сітки 
            timeValues.push(T);
            verticalVelocities.push(Y[2]);
            
            // дод до гра
            chart.data.labels.push(T.toFixed(2));
            chart.data.datasets[1].data.push(Y[2]);
            
            T += DT;
        }
        
        chart.update();
        updateDataGrid(timeValues, verticalVelocities);
        displayCoefficients(C, { c_ybal, a_bal, D_bal });
    }

    // розр кут атаки
    function calculateAngleOfAttack() {
        clearData();
        
        // показ кут атіки / прихов інш
        chart.data.datasets.forEach((dataset, i) => {
            dataset.hidden = (i !== 2);
        });
        
        const m = vmas[2] / vmas[9];
        const C = new Array(17).fill(0);
        
        // розр кофф
        C[1] = -(vmas[15] / vmas[4]) * vmas[0] * Math.pow(vmas[1], 2) * ((vmas[7] * vmas[5]) / 2);
        C[2] = -(vmas[17] / vmas[4]) * vmas[0] * vmas[1] * ((vmas[7] * Math.pow(vmas[5], 2)) / 2);
        C[3] = -(vmas[18] / vmas[4]) * vmas[0] * vmas[1] * ((vmas[7] * Math.pow(vmas[5], 2)) / 2);
        C[4] = ((vmas[11] + vmas[13]) / m) * vmas[0] * ((vmas[7] * vmas[5]) / 2);
        C[5] = -(vmas[16] / vmas[4]) * vmas[0] * Math.pow(vmas[1], 2) * ((vmas[7] * vmas[5]) / 2);
        C[6] = (vmas[12] / m) * vmas[0] * ((vmas[7] * vmas[5]) / 2);
        C[7] = vmas[5] / (m * vmas[9]);
        
        // поч Х та У кофф
        const X = [0, 0, 0, 0, 0];
        const Y = [0, 0, 0, 0, 0];
        
        // розр баланс кофф
        const c_ybal = (2 * vmas[2]) / (vmas[0] * vmas[7] * Math.pow(vmas[5], 2));
        const a_bal = 57.3 * ((c_ybal - vmas[10]) / vmas[11]);
        const D_bal = -57.3 * (((vmas[14] + vmas[17] * a_bal) / 57.3) + (c_ybal * (vmas[3] - 0.24))) / vmas[18];
        
        // цикл симул
        let T = 0;
        const DT = step;
        const timeValues = [];
        const angleOfAttacks = [];
        
        while (T < 20.001) {
            DVD = calculateDVD(Y);
            X[4] = DVD;
            DV = DVS + DVD;
            
            // розр х
            X[0] = Y[1];
            X[1] = -C[1] * Y[1] - C[2] * Y[3] - C[5] * X[3] - C[3] * DV;
            X[2] = C[4] * Y[3] + C[6] * DV;
            X[3] = X[0] - X[2];
            NY = C[7] * X[2];
            
            // Метод Ейлера розо У
            for (let i = 0; i < 5; i++) {
                Y[i] = Y[i] + X[i] * DT;
            }
            
            // дод даніе до граф та сітки 
            timeValues.push(T);
            angleOfAttacks.push(Y[3]);
            
            // дод до графф
            chart.data.labels.push(T.toFixed(2));
            chart.data.datasets[2].data.push(Y[3]);
            
            T += DT;
        }
        
        chart.update();
        updateDataGrid(timeValues, angleOfAttacks);
        displayCoefficients(C, { c_ybal, a_bal, D_bal });
    }

    // верт перенаван
    function calculateVerticalLoad() {
        clearData();
        
        // показ верт перена схов інш
        chart.data.datasets.forEach((dataset, i) => {
            dataset.hidden = (i !== 3);
        });
        
        const m = vmas[2] / vmas[9];
        const C = new Array(17).fill(0);
        
        // розр кофф
        C[1] = -(vmas[15] / vmas[4]) * vmas[0] * Math.pow(vmas[1], 2) * ((vmas[7] * vmas[5]) / 2);
        C[2] = -(vmas[17] / vmas[4]) * vmas[0] * vmas[1] * ((vmas[7] * Math.pow(vmas[5], 2)) / 2);
        C[3] = -(vmas[18] / vmas[4]) * vmas[0] * vmas[1] * ((vmas[7] * Math.pow(vmas[5], 2)) / 2);
        C[4] = ((vmas[11] + vmas[13]) / m) * vmas[0] * ((vmas[7] * vmas[5]) / 2);
        C[5] = -(vmas[16] / vmas[4]) * vmas[0] * Math.pow(vmas[1], 2) * ((vmas[7] * vmas[5]) / 2);
        C[6] = (vmas[12] / m) * vmas[0] * ((vmas[7] * vmas[5]) / 2);
        C[7] = vmas[5] / (m * vmas[9]);
        
        // поч Х У 
        const X = [0, 0, 0, 0, 0];
        const Y = [0, 0, 0, 0, 0];
        
        // розр баланс кофф
        const c_ybal = (2 * vmas[2]) / (vmas[0] * vmas[7] * Math.pow(vmas[5], 2));
        const a_bal = 57.3 * ((c_ybal - vmas[10]) / vmas[11]);
        const D_bal = -57.3 * (((vmas[14] + vmas[17] * a_bal) / 57.3) + (c_ybal * (vmas[3] - 0.24))) / vmas[18];
        
        // 
        let T = 0;
        const DT = step;
        const timeValues = [];
        const verticalLoads = [];
        
        while (T < 20.001) {
            DVD = calculateDVD(Y);
            X[4] = DVD;
            DV = DVS + DVD;
            
            // розр Х
            X[0] = Y[1];
            X[1] = -C[1] * Y[1] - C[2] * Y[3] - C[5] * X[3] - C[3] * DV;
            X[2] = C[4] * Y[3] + C[6] * DV;
            X[3] = X[0] - X[2];
            NY = C[7] * X[2];
            
            // м Ейлера розр У
            for (let i = 0; i < 5; i++) {
                Y[i] = Y[i] + X[i] * DT;
            }
            
            // дод граф даніе та сітки
            timeValues.push(T);
            verticalLoads.push(NY);
            
            // дод до граф
            chart.data.labels.push(T.toFixed(2));
            chart.data.datasets[3].data.push(NY);
            
            T += DT;
        }
        
        chart.update();
        updateDataGrid(timeValues, verticalLoads);
        displayCoefficients(C, { c_ybal, a_bal, D_bal });
    }

    // лісенері кнопок
    document.getElementById('btnPitchAngle').addEventListener('click', calculatePitchAngle);
    document.getElementById('btnVerticalVelocity').addEventListener('click', calculateVerticalVelocity);
    document.getElementById('btnAngleOfAttack').addEventListener('click', calculateAngleOfAttack);
    document.getElementById('btnVerticalLoad').addEventListener('click', calculateVerticalLoad);
    document.getElementById('btnClearAll').addEventListener('click', clearData);
    
    // лісенері радіо-кнопок
    document.querySelectorAll('input[name="controlLaw"]').forEach(radio => {
        radio.addEventListener('change', function() {
            selectedControlLaw = parseInt(this.value);
            // Перерахувати з поточним активним розрахунком
            const activeDatasetIndex = chart.data.datasets.findIndex(dataset => !dataset.hidden);
            if (activeDatasetIndex === 0) calculatePitchAngle();
            else if (activeDatasetIndex === 1) calculateVerticalVelocity();
            else if (activeDatasetIndex === 2) calculateAngleOfAttack();
            else if (activeDatasetIndex === 3) calculateVerticalLoad();
        });
    });

    // Ініціалізація з розрахунком кута тангажу
    calculatePitchAngle();
});




const reverseFn = (numberInt) => {
    numberInt.split('').reverse().join('')
    return Number(numberInt)
}