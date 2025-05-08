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
                    max: 20, // Максимальное значение для оси X - 20 секунд
                    ticks: {
                        stepSize: 0.5 // теперь будет правильно каждые 0.5
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Value' // Назва осі Y — Значення
                    }
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
        
        // Фильтруем точки с интервалом 0.5 секунд для отображения в таблице
        const filteredData = [];
        for (let i = 0; i < numRows; i++) {
            // Проверяем, является ли точка кратной 0.5 секундам (с учетом погрешности для чисел с плавающей точкой)
            if (Math.abs(timeValues[i] % 0.5) < 0.001 || i === 0 || i === numRows - 1) {
                filteredData.push({
                    time: timeValues[i],
                    value: dataValues[i]
                });
            }
        }
        
        // Отображаем только отфильтрованные точки
        filteredData.forEach(point => {
            const row = document.createElement('tr');
            
            const timeCell = document.createElement('td');
            timeCell.textContent = point.time.toFixed(2) + 's';
            
            const valueCell = document.createElement('td');
            valueCell.textContent = point.value.toFixed(6);
            
            row.appendChild(timeCell);
            row.appendChild(valueCell);
            tableBody.appendChild(row);
        });
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
        C[5] = -(vmas[19] / vmas[4]) * vmas[0] * vmas[1] * ((vmas[7] * Math.pow(vmas[5], 2)) / 2);
        C[6] = ((vmas[15]) / m) * vmas[0] * ((vmas[7] * vmas[5]) / 2);
        C[7] = (1 / vmas[9]) * (vmas[11] + vmas[13]) * vmas[0] * ((vmas[7] * vmas[5]) / 2);
        C[8] = (vmas[14] - vmas[3]) * (vmas[11] + vmas[13]) * vmas[0] * Math.pow(vmas[1], 2) * ((vmas[7] * vmas[5]) / 2);
        C[9] = ((vmas[3] - vmas[14]) * (vmas[15] + vmas[11] + vmas[13]) + vmas[15] * vmas[14]) * vmas[0] * Math.pow(vmas[1], 2) * ((vmas[7] * vmas[5]) / 2);
        C[10] = Math.pow(vmas[15], 2) * vmas[0] * Math.pow(vmas[1], 3) * ((vmas[7] * vmas[5]) / 2);
        C[11] = vmas[11] * vmas[0] * vmas[1] * ((vmas[7] * vmas[5]) / 2);
        C[12] = vmas[15] * vmas[0] * vmas[1] * ((vmas[7] * vmas[5]) / 2);
        C[13] = vmas[15] * vmas[16] * vmas[0] * Math.pow(vmas[1], 2) * ((vmas[7] * vmas[5]) / 2);
        C[14] = (vmas[15] * (vmas[14] - vmas[3]) + vmas[17]) * vmas[0] * Math.pow(vmas[1], 2) * ((vmas[7] * vmas[5]) / 2);
        C[15] = vmas[15] * vmas[18] * vmas[0] * Math.pow(vmas[1], 2) * ((vmas[7] * vmas[5]) / 2);
        C[16] = vmas[15] * vmas[19] * vmas[0] * Math.pow(vmas[1], 2) * ((vmas[7] * vmas[5]) / 2);

        // початкові умови (IC - Initial Conditions)
        const Y = [
            0, // кут тангажу y(0)
            0, // кутова швидкість y'(0)
            0, // кут траекторії θ(0)
            0, // кут атаки α(0)
            0  // z(0)
        ];

        // Масиви для зберігання результатів обчислень
        const timeValues = [];
        const pitchValues = [];
        const trajectoryAnglesValues = [];
        const attackAnglesValues = [];
        const nyValues = [];

        // Змінні для ітеративних обчислень
        let X = new Array(Y.length).fill(0);
        let k1 = new Array(Y.length).fill(0);
        let y_temp = new Array(Y.length).fill(0);
        let k2 = new Array(Y.length).fill(0);
        let k3 = new Array(Y.length).fill(0);
        let y_temp3 = new Array(Y.length).fill(0);
        let k4 = new Array(Y.length).fill(0);

        // Кількість ітерацій для досягнення 20 секунд симуляції
        const numIterations = 20 / step + 1;
        
        // Масиви для отфильтрованных точек для отображения на графике
        const filteredTimePoints = [];
        const filteredPitchPoints = [];
        const filteredTrajectoryPoints = [];
        const filteredAttackPoints = [];
        const filteredNyPoints = [];

        // Функция для проверки, следует ли включить точку в отфильтрованный набор данных
        function shouldIncludePoint(time) {
            // Включаем точки с интервалом 0.5 секунд для отображения
            return Math.abs(time % 0.5) < 0.001 || time === 0 || time >= 20;
        }

        // Основний цикл інтегрування
        for (let i = 0; i < numIterations; i++) {
            let time = i * step;
            
            // Ошибка коррекции зависимая от угла атаки
            let deltaM = -KS * Y[3];
            
            // Суммарное отклонение руля
            DV = DVS + deltaM + calculateDVD(Y);

            // Расчет производных
            X[0] = Y[1]; // тангаж
            X[1] = -C[1] * Y[1] - C[2] * Y[3] - C[5] * X[3] - C[3] * DV; // кутова шв
            X[2] = C[4] * Y[3] + C[6] * DV; // нахил траєкт
            X[3] = X[0] - X[2]; // кут атаки

            // Вычисление перегрузки
            NY = C[7] * X[2];

            // Вычисление k1 (Метод Рунге-Кутта 4-го порядка)
            k1[0] = X[0];
            k1[1] = X[1];
            k1[2] = X[2];
            k1[3] = X[3];
            if (selectedControlLaw === 3) {
                k1[4] = DVD;
            }

            // Вычисление временных значений Y для k2
            for (let j = 0; j < Y.length; j++) {
                y_temp[j] = Y[j] + 0.5 * step * k1[j];
            }

            // Расчет X с временными Y для k2
            deltaM = -KS * y_temp[3];
            DV = DVS + deltaM + calculateDVD(y_temp);

            X[0] = y_temp[1];
            X[1] = -C[1] * y_temp[1] - C[2] * y_temp[3] - C[5] * X[3] - C[3] * DV;
            X[2] = C[4] * y_temp[3] + C[6] * DV;
            X[3] = X[0] - X[2];

            // Вычисление k2
            k2[0] = X[0];
            k2[1] = X[1];
            k2[2] = X[2];
            k2[3] = X[3];
            if (selectedControlLaw === 3) {
                k2[4] = DVD;
            }

            // Вычисление временных значений Y для k3
            for (let j = 0; j < Y.length; j++) {
                y_temp[j] = Y[j] + 0.5 * step * k2[j];
            }

            // Расчет X с временными Y для k3
            deltaM = -KS * y_temp[3];
            DV = DVS + deltaM + calculateDVD(y_temp);

            X[0] = y_temp[1];
            X[1] = -C[1] * y_temp[1] - C[2] * y_temp[3] - C[5] * X[3] - C[3] * DV;
            X[2] = C[4] * y_temp[3] + C[6] * DV;
            X[3] = X[0] - X[2];

            // Вычисление k3
            k3[0] = X[0];
            k3[1] = X[1];
            k3[2] = X[2];
            k3[3] = X[3];
            if (selectedControlLaw === 3) {
                k3[4] = DVD;
            }

            // Вычисление временных значений Y для k4
            for (let j = 0; j < Y.length; j++) {
                y_temp3[j] = Y[j] + step * k3[j];
            }

            // Расчет X с временными Y для k4
            deltaM = -KS * y_temp3[3];
            DV = DVS + deltaM + calculateDVD(y_temp3);

            X[0] = y_temp3[1];
            X[1] = -C[1] * y_temp3[1] - C[2] * y_temp3[3] - C[5] * X[3] - C[3] * DV;
            X[2] = C[4] * y_temp3[3] + C[6] * DV;
            X[3] = X[0] - X[2];

            // Вычисление k4
            k4[0] = X[0];
            k4[1] = X[1];
            k4[2] = X[2];
            k4[3] = X[3];
            if (selectedControlLaw === 3) {
                k4[4] = DVD;
            }

            // Итоговое обновление Y
            for (let j = 0; j < Y.length; j++) {
                Y[j] = Y[j] + (step / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]);
            }

            // Сохраняем результаты для графиков и таблиц с обычным шагом
            timeValues.push(time);
            pitchValues.push(Y[0] * 180 / Math.PI); // перевод в градусы
            trajectoryAnglesValues.push(Y[2] * 180 / Math.PI);
            attackAnglesValues.push(Y[3] * 180 / Math.PI);
            nyValues.push(NY);
            
            // Фильтруем данные для отображения на графике и в таблице с шагом 0.5 секунд
            if (shouldIncludePoint(time)) {
                filteredTimePoints.push(time);
                filteredPitchPoints.push(Y[0] * 180 / Math.PI);
                filteredTrajectoryPoints.push(Y[2] * 180 / Math.PI);
                filteredAttackPoints.push(Y[3] * 180 / Math.PI);
                filteredNyPoints.push(NY);
            }
        }

        // Обновление графика с отфильтрованными точками
        chart.data.labels = filteredTimePoints;
        chart.data.datasets[0].data = filteredPitchPoints.map((value, index) => ({
            x: filteredTimePoints[index],
            y: value
        }));
        chart.data.datasets[1].data = filteredTrajectoryPoints.map((value, index) => ({
            x: filteredTimePoints[index],
            y: value
        }));
        chart.data.datasets[2].data = filteredAttackPoints.map((value, index) => ({
            x: filteredTimePoints[index],
            y: value
        }));
        chart.data.datasets[3].data = filteredNyPoints.map((value, index) => ({
            x: filteredTimePoints[index],
            y: value
        }));

        chart.update();

        // Обновление таблицы с отфильтрованными точками
        updateDataGrid(filteredTimePoints, filteredPitchPoints);

        // Отображение коэффициентов
        displayCoefficients(C);
    }

    // розр кут нахил траект
    function calculateTrajectoryAngle() {
        clearData();
        
        // Показуємо графік для кута нахилу траєкторії, приховуємо інші
        chart.data.datasets.forEach((dataset, i) => {
            dataset.hidden = (i !== 1);
        });
        
        const m = vmas[2] / vmas[9];
        const C = new Array(17).fill(0);
        
        // розр кофф
        C[1] = -(vmas[15] / vmas[4]) * vmas[0] * Math.pow(vmas[1], 2) * ((vmas[7] * vmas[5]) / 2);
        C[2] = -(vmas[17] / vmas[4]) * vmas[0] * vmas[1] * ((vmas[7] * Math.pow(vmas[5], 2)) / 2);
        C[3] = -(vmas[18] / vmas[4]) * vmas[0] * vmas[1] * ((vmas[7] * Math.pow(vmas[5], 2)) / 2);
        C[4] = ((vmas[11] + vmas[13]) / m) * vmas[0] * ((vmas[7] * vmas[5]) / 2);
        C[5] = -(vmas[19] / vmas[4]) * vmas[0] * vmas[1] * ((vmas[7] * Math.pow(vmas[5], 2)) / 2);
        C[6] = ((vmas[15]) / m) * vmas[0] * ((vmas[7] * vmas[5]) / 2);
        C[7] = (1 / vmas[9]) * (vmas[11] + vmas[13]) * vmas[0] * ((vmas[7] * vmas[5]) / 2);
        C[8] = (vmas[14] - vmas[3]) * (vmas[11] + vmas[13]) * vmas[0] * Math.pow(vmas[1], 2) * ((vmas[7] * vmas[5]) / 2);
        C[9] = ((vmas[3] - vmas[14]) * (vmas[15] + vmas[11] + vmas[13]) + vmas[15] * vmas[14]) * vmas[0] * Math.pow(vmas[1], 2) * ((vmas[7] * vmas[5]) / 2);
        C[10] = Math.pow(vmas[15], 2) * vmas[0] * Math.pow(vmas[1], 3) * ((vmas[7] * vmas[5]) / 2);
        C[11] = vmas[11] * vmas[0] * vmas[1] * ((vmas[7] * vmas[5]) / 2);
        C[12] = vmas[15] * vmas[0] * vmas[1] * ((vmas[7] * vmas[5]) / 2);
        C[13] = vmas[15] * vmas[16] * vmas[0] * Math.pow(vmas[1], 2) * ((vmas[7] * vmas[5]) / 2);
        C[14] = (vmas[15] * (vmas[14] - vmas[3]) + vmas[17]) * vmas[0] * Math.pow(vmas[1], 2) * ((vmas[7] * vmas[5]) / 2);
        C[15] = vmas[15] * vmas[18] * vmas[0] * Math.pow(vmas[1], 2) * ((vmas[7] * vmas[5]) / 2);
        C[16] = vmas[15] * vmas[19] * vmas[0] * Math.pow(vmas[1], 2) * ((vmas[7] * vmas[5]) / 2);

        // початкові умови (IC - Initial Conditions)
        const Y = [
            0, // кут тангажу y(0)
            0, // кутова швидкість y'(0)
            0, // кут траекторії θ(0)
            0, // кут атаки α(0)
            0  // z(0)
        ];

        // Масиви для зберігання результатів обчислень
        const timeValues = [];
        const pitchValues = [];
        const trajectoryAnglesValues = [];
        const attackAnglesValues = [];
        const nyValues = [];

        // Масиви для отфильтрованных точек для отображения на графике
        const filteredTimePoints = [];
        const filteredPitchPoints = [];
        const filteredTrajectoryPoints = [];
        const filteredAttackPoints = [];
        const filteredNyPoints = [];

        // Функция для проверки, следует ли включить точку в отфильтрованный набор данных
        function shouldIncludePoint(time) {
            // Включаем точки с интервалом 0.5 секунд для отображения
            return Math.abs(time % 0.5) < 0.001 || time === 0 || time >= 20;
        }

        // Змінні для ітеративних обчислень
        let X = new Array(Y.length).fill(0);
        let k1 = new Array(Y.length).fill(0);
        let y_temp = new Array(Y.length).fill(0);
        let k2 = new Array(Y.length).fill(0);
        let k3 = new Array(Y.length).fill(0);
        let y_temp3 = new Array(Y.length).fill(0);
        let k4 = new Array(Y.length).fill(0);

        // Кількість ітерацій для досягнення 20 секунд симуляції
        const numIterations = 20 / step + 1;

        // Основний цикл інтегрування
        for (let i = 0; i < numIterations; i++) {
            let time = i * step;
            
            // Ошибка коррекции зависимая от угла атаки
            let deltaM = -KS * Y[3];
            
            // Суммарное отклонение руля
            DV = DVS + deltaM + calculateDVD(Y);

            // Расчет производных
            X[0] = Y[1]; // тангаж
            X[1] = -C[1] * Y[1] - C[2] * Y[3] - C[5] * X[3] - C[3] * DV; // кутова шв
            X[2] = C[4] * Y[3] + C[6] * DV; // нахил траєкт
            X[3] = X[0] - X[2]; // кут атаки

            // Вычисление перегрузки
            NY = C[7] * X[2];

            // Вычисление k1 (Метод Рунге-Кутта 4-го порядка)
            k1[0] = X[0];
            k1[1] = X[1];
            k1[2] = X[2];
            k1[3] = X[3];
            if (selectedControlLaw === 3) {
                k1[4] = DVD;
            }

            // Вычисление временных значений Y для k2
            for (let j = 0; j < Y.length; j++) {
                y_temp[j] = Y[j] + 0.5 * step * k1[j];
            }

            // Расчет X с временными Y для k2
            deltaM = -KS * y_temp[3];
            DV = DVS + deltaM + calculateDVD(y_temp);

            X[0] = y_temp[1];
            X[1] = -C[1] * y_temp[1] - C[2] * y_temp[3] - C[5] * X[3] - C[3] * DV;
            X[2] = C[4] * y_temp[3] + C[6] * DV;
            X[3] = X[0] - X[2];

            // Вычисление k2
            k2[0] = X[0];
            k2[1] = X[1];
            k2[2] = X[2];
            k2[3] = X[3];
            if (selectedControlLaw === 3) {
                k2[4] = DVD;
            }

            // Вычисление временных значений Y для k3
            for (let j = 0; j < Y.length; j++) {
                y_temp[j] = Y[j] + 0.5 * step * k2[j];
            }

            // Расчет X с временными Y для k3
            deltaM = -KS * y_temp[3];
            DV = DVS + deltaM + calculateDVD(y_temp);

            X[0] = y_temp[1];
            X[1] = -C[1] * y_temp[1] - C[2] * y_temp[3] - C[5] * X[3] - C[3] * DV;
            X[2] = C[4] * y_temp[3] + C[6] * DV;
            X[3] = X[0] - X[2];

            // Вычисление k3
            k3[0] = X[0];
            k3[1] = X[1];
            k3[2] = X[2];
            k3[3] = X[3];
            if (selectedControlLaw === 3) {
                k3[4] = DVD;
            }

            // Вычисление временных значений Y для k4
            for (let j = 0; j < Y.length; j++) {
                y_temp3[j] = Y[j] + step * k3[j];
            }

            // Расчет X с временными Y для k4
            deltaM = -KS * y_temp3[3];
            DV = DVS + deltaM + calculateDVD(y_temp3);

            X[0] = y_temp3[1];
            X[1] = -C[1] * y_temp3[1] - C[2] * y_temp3[3] - C[5] * X[3] - C[3] * DV;
            X[2] = C[4] * y_temp3[3] + C[6] * DV;
            X[3] = X[0] - X[2];

            // Вычисление k4
            k4[0] = X[0];
            k4[1] = X[1];
            k4[2] = X[2];
            k4[3] = X[3];
            if (selectedControlLaw === 3) {
                k4[4] = DVD;
            }

            // Итоговое обновление Y
            for (let j = 0; j < Y.length; j++) {
                Y[j] = Y[j] + (step / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]);
            }

            // Сохраняем результаты для графиков и таблиц
            timeValues.push(time);
            pitchValues.push(Y[0] * 180 / Math.PI); // перевод в градусы
            trajectoryAnglesValues.push(Y[2] * 180 / Math.PI);
            attackAnglesValues.push(Y[3] * 180 / Math.PI);
            nyValues.push(NY);
            
            // Фильтруем данные для отображения на графике и в таблице с шагом 0.5 секунд
            if (shouldIncludePoint(time)) {
                filteredTimePoints.push(time);
                filteredPitchPoints.push(Y[0] * 180 / Math.PI);
                filteredTrajectoryPoints.push(Y[2] * 180 / Math.PI);
                filteredAttackPoints.push(Y[3] * 180 / Math.PI);
                filteredNyPoints.push(NY);
            }
        }

        // Обновление графика с отфильтрованными точками
        chart.data.labels = filteredTimePoints;
        chart.data.datasets[0].data = filteredPitchPoints.map((value, index) => ({
            x: filteredTimePoints[index],
            y: value
        }));
        chart.data.datasets[1].data = filteredTrajectoryPoints.map((value, index) => ({
            x: filteredTimePoints[index],
            y: value
        }));
        chart.data.datasets[2].data = filteredAttackPoints.map((value, index) => ({
            x: filteredTimePoints[index],
            y: value
        }));
        chart.data.datasets[3].data = filteredNyPoints.map((value, index) => ({
            x: filteredTimePoints[index],
            y: value
        }));

        chart.update();

        // Обновление таблицы с отфильтрованными точками
        updateDataGrid(filteredTimePoints, filteredTrajectoryPoints);

        // Отображение коэффициентов
        displayCoefficients(C);
    }

    // розр кут атаки
    function calculateAttackAngle() {
        clearData();
        
        // Показуємо графік для кута атаки, приховуємо інші
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
        C[5] = -(vmas[19] / vmas[4]) * vmas[0] * vmas[1] * ((vmas[7] * Math.pow(vmas[5], 2)) / 2);
        C[6] = ((vmas[15]) / m) * vmas[0] * ((vmas[7] * vmas[5]) / 2);
        C[7] = (1 / vmas[9]) * (vmas[11] + vmas[13]) * vmas[0] * ((vmas[7] * vmas[5]) / 2);
        C[8] = (vmas[14] - vmas[3]) * (vmas[11] + vmas[13]) * vmas[0] * Math.pow(vmas[1], 2) * ((vmas[7] * vmas[5]) / 2);
        C[9] = ((vmas[3] - vmas[14]) * (vmas[15] + vmas[11] + vmas[13]) + vmas[15] * vmas[14]) * vmas[0] * Math.pow(vmas[1], 2) * ((vmas[7] * vmas[5]) / 2);
        C[10] = Math.pow(vmas[15], 2) * vmas[0] * Math.pow(vmas[1], 3) * ((vmas[7] * vmas[5]) / 2);
        C[11] = vmas[11] * vmas[0] * vmas[1] * ((vmas[7] * vmas[5]) / 2);
        C[12] = vmas[15] * vmas[0] * vmas[1] * ((vmas[7] * vmas[5]) / 2);
        C[13] = vmas[15] * vmas[16] * vmas[0] * Math.pow(vmas[1], 2) * ((vmas[7] * vmas[5]) / 2);
        C[14] = (vmas[15] * (vmas[14] - vmas[3]) + vmas[17]) * vmas[0] * Math.pow(vmas[1], 2) * ((vmas[7] * vmas[5]) / 2);
        C[15] = vmas[15] * vmas[18] * vmas[0] * Math.pow(vmas[1], 2) * ((vmas[7] * vmas[5]) / 2);
        C[16] = vmas[15] * vmas[19] * vmas[0] * Math.pow(vmas[1], 2) * ((vmas[7] * vmas[5]) / 2);

        // початкові умови (IC - Initial Conditions)
        const Y = [
            0, // кут тангажу y(0)
            0, // кутова швидкість y'(0)
            0, // кут траекторії θ(0)
            0, // кут атаки α(0)
            0  // z(0)
        ];

        // Масиви для зберігання результатів обчислень
        const timeValues = [];
        const pitchValues = [];
        const trajectoryAnglesValues = [];
        const attackAnglesValues = [];
        const nyValues = [];

        // Масиви для отфильтрованных точек для отображения на графике
        const filteredTimePoints = [];
        const filteredPitchPoints = [];
        const filteredTrajectoryPoints = [];
        const filteredAttackPoints = [];
        const filteredNyPoints = [];

        // Функция для проверки, следует ли включить точку в отфильтрованный набор данных
        function shouldIncludePoint(time) {
            // Включаем точки с интервалом 0.5 секунд для отображения
            return Math.abs(time % 0.5) < 0.001 || time === 0 || time >= 20;
        }

        // Змінні для ітеративних обчислень
        let X = new Array(Y.length).fill(0);
        let k1 = new Array(Y.length).fill(0);
        let y_temp = new Array(Y.length).fill(0);
        let k2 = new Array(Y.length).fill(0);
        let k3 = new Array(Y.length).fill(0);
        let y_temp3 = new Array(Y.length).fill(0);
        let k4 = new Array(Y.length).fill(0);

        // Кількість ітерацій для досягнення 20 секунд симуляції
        const numIterations = 20 / step + 1;

        // Основний цикл інтегрування
        for (let i = 0; i < numIterations; i++) {
            let time = i * step;
            
            // Ошибка коррекции зависимая от угла атаки
            let deltaM = -KS * Y[3];
            
            // Суммарное отклонение руля
            DV = DVS + deltaM + calculateDVD(Y);

            // Расчет производных
            X[0] = Y[1]; // тангаж
            X[1] = -C[1] * Y[1] - C[2] * Y[3] - C[5] * X[3] - C[3] * DV; // кутова шв
            X[2] = C[4] * Y[3] + C[6] * DV; // нахил траєкт
            X[3] = X[0] - X[2]; // кут атаки

            // Вычисление перегрузки
            NY = C[7] * X[2];

            // Вычисление k1 (Метод Рунге-Кутта 4-го порядка)
            k1[0] = X[0];
            k1[1] = X[1];
            k1[2] = X[2];
            k1[3] = X[3];
            if (selectedControlLaw === 3) {
                k1[4] = DVD;
            }

            // Вычисление временных значений Y для k2
            for (let j = 0; j < Y.length; j++) {
                y_temp[j] = Y[j] + 0.5 * step * k1[j];
            }

            // Расчет X с временными Y для k2
            deltaM = -KS * y_temp[3];
            DV = DVS + deltaM + calculateDVD(y_temp);

            X[0] = y_temp[1];
            X[1] = -C[1] * y_temp[1] - C[2] * y_temp[3] - C[5] * X[3] - C[3] * DV;
            X[2] = C[4] * y_temp[3] + C[6] * DV;
            X[3] = X[0] - X[2];

            // Вычисление k2
            k2[0] = X[0];
            k2[1] = X[1];
            k2[2] = X[2];
            k2[3] = X[3];
            if (selectedControlLaw === 3) {
                k2[4] = DVD;
            }

            // Вычисление временных значений Y для k3
            for (let j = 0; j < Y.length; j++) {
                y_temp[j] = Y[j] + 0.5 * step * k2[j];
            }

            // Расчет X с временными Y для k3
            deltaM = -KS * y_temp[3];
            DV = DVS + deltaM + calculateDVD(y_temp);

            X[0] = y_temp[1];
            X[1] = -C[1] * y_temp[1] - C[2] * y_temp[3] - C[5] * X[3] - C[3] * DV;
            X[2] = C[4] * y_temp[3] + C[6] * DV;
            X[3] = X[0] - X[2];

            // Вычисление k3
            k3[0] = X[0];
            k3[1] = X[1];
            k3[2] = X[2];
            k3[3] = X[3];
            if (selectedControlLaw === 3) {
                k3[4] = DVD;
            }

            // Вычисление временных значений Y для k4
            for (let j = 0; j < Y.length; j++) {
                y_temp3[j] = Y[j] + step * k3[j];
            }

            // Расчет X с временными Y для k4
            deltaM = -KS * y_temp3[3];
            DV = DVS + deltaM + calculateDVD(y_temp3);

            X[0] = y_temp3[1];
            X[1] = -C[1] * y_temp3[1] - C[2] * y_temp3[3] - C[5] * X[3] - C[3] * DV;
            X[2] = C[4] * y_temp3[3] + C[6] * DV;
            X[3] = X[0] - X[2];

            // Вычисление k4
            k4[0] = X[0];
            k4[1] = X[1];
            k4[2] = X[2];
            k4[3] = X[3];
            if (selectedControlLaw === 3) {
                k4[4] = DVD;
            }

            // Итоговое обновление Y
            for (let j = 0; j < Y.length; j++) {
                Y[j] = Y[j] + (step / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]);
            }

            // Сохраняем результаты для графиков и таблиц
            timeValues.push(time);
            pitchValues.push(Y[0] * 180 / Math.PI); // перевод в градусы
            trajectoryAnglesValues.push(Y[2] * 180 / Math.PI);
            attackAnglesValues.push(Y[3] * 180 / Math.PI);
            nyValues.push(NY);
            
            // Фильтруем данные для отображения на графике и в таблице с шагом 0.5 секунд
            if (shouldIncludePoint(time)) {
                filteredTimePoints.push(time);
                filteredPitchPoints.push(Y[0] * 180 / Math.PI);
                filteredTrajectoryPoints.push(Y[2] * 180 / Math.PI);
                filteredAttackPoints.push(Y[3] * 180 / Math.PI);
                filteredNyPoints.push(NY);
            }
        }

        // Обновление графика с отфильтрованными точками
        chart.data.labels = filteredTimePoints;
        chart.data.datasets[0].data = filteredPitchPoints.map((value, index) => ({
            x: filteredTimePoints[index],
            y: value
        }));
        chart.data.datasets[1].data = filteredTrajectoryPoints.map((value, index) => ({
            x: filteredTimePoints[index],
            y: value
        }));
        chart.data.datasets[2].data = filteredAttackPoints.map((value, index) => ({
            x: filteredTimePoints[index],
            y: value
        }));
        chart.data.datasets[3].data = filteredNyPoints.map((value, index) => ({
            x: filteredTimePoints[index],
            y: value
        }));

        chart.update();

        // Обновление таблицы с отфильтрованными точками
        updateDataGrid(filteredTimePoints, filteredAttackPoints);

        // Отображение коэффициентов
        displayCoefficients(C);
    }

    // розр вертикал
    function calculateVerticalOverload() {
        clearData();
        
        // Показуємо графік для вертикального перенавантаження, приховуємо інші
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
        C[5] = -(vmas[19] / vmas[4]) * vmas[0] * vmas[1] * ((vmas[7] * Math.pow(vmas[5], 2)) / 2);
        C[6] = ((vmas[15]) / m) * vmas[0] * ((vmas[7] * vmas[5]) / 2);
        C[7] = (1 / vmas[9]) * (vmas[11] + vmas[13]) * vmas[0] * ((vmas[7] * vmas[5]) / 2);
        C[8] = (vmas[14] - vmas[3]) * (vmas[11] + vmas[13]) * vmas[0] * Math.pow(vmas[1], 2) * ((vmas[7] * vmas[5]) / 2);
        C[9] = ((vmas[3] - vmas[14]) * (vmas[15] + vmas[11] + vmas[13]) + vmas[15] * vmas[14]) * vmas[0] * Math.pow(vmas[1], 2) * ((vmas[7] * vmas[5]) / 2);
        C[10] = Math.pow(vmas[15], 2) * vmas[0] * Math.pow(vmas[1], 3) * ((vmas[7] * vmas[5]) / 2);
        C[11] = vmas[11] * vmas[0] * vmas[1] * ((vmas[7] * vmas[5]) / 2);
        C[12] = vmas[15] * vmas[0] * vmas[1] * ((vmas[7] * vmas[5]) / 2);
        C[13] = vmas[15] * vmas[16] * vmas[0] * Math.pow(vmas[1], 2) * ((vmas[7] * vmas[5]) / 2);
        C[14] = (vmas[15] * (vmas[14] - vmas[3]) + vmas[17]) * vmas[0] * Math.pow(vmas[1], 2) * ((vmas[7] * vmas[5]) / 2);
        C[15] = vmas[15] * vmas[18] * vmas[0] * Math.pow(vmas[1], 2) * ((vmas[7] * vmas[5]) / 2);
        C[16] = vmas[15] * vmas[19] * vmas[0] * Math.pow(vmas[1], 2) * ((vmas[7] * vmas[5]) / 2);

        // початкові умови (IC - Initial Conditions)
        const Y = [
            0, // кут тангажу y(0)
            0, // кутова швидкість y'(0)
            0, // кут траекторії θ(0)
            0, // кут атаки α(0)
            0  // z(0)
        ];

        // Масиви для зберігання результатів обчислень
        const timeValues = [];
        const pitchValues = [];
        const trajectoryAnglesValues = [];
        const attackAnglesValues = [];
        const nyValues = [];

        // Масиви для отфильтрованных точек для отображения на графике
        const filteredTimePoints = [];
        const filteredPitchPoints = [];
        const filteredTrajectoryPoints = [];
        const filteredAttackPoints = [];
        const filteredNyPoints = [];

        // Функция для проверки, следует ли включить точку в отфильтрованный набор данных
        function shouldIncludePoint(time) {
            // Включаем точки с интервалом 0.5 секунд для отображения
            return Math.abs(time % 0.5) < 0.001 || time === 0 || time >= 20;
        }

        // Змінні для ітеративних обчислень
        let X = new Array(Y.length).fill(0);
        let k1 = new Array(Y.length).fill(0);
        let y_temp = new Array(Y.length).fill(0);
        let k2 = new Array(Y.length).fill(0);
        let k3 = new Array(Y.length).fill(0);
        let y_temp3 = new Array(Y.length).fill(0);
        let k4 = new Array(Y.length).fill(0);

        // Кількість ітерацій для досягнення 20 секунд симуляції
        const numIterations = 20 / step + 1;

        // Основний цикл інтегрування
        for (let i = 0; i < numIterations; i++) {
            let time = i * step;
            
            // Ошибка коррекции зависимая от угла атаки
            let deltaM = -KS * Y[3];
            
            // Суммарное отклонение руля
            DV = DVS + deltaM + calculateDVD(Y);

            // Расчет производных
            X[0] = Y[1]; // тангаж
            X[1] = -C[1] * Y[1] - C[2] * Y[3] - C[5] * X[3] - C[3] * DV; // кутова шв
            X[2] = C[4] * Y[3] + C[6] * DV; // нахил траєкт
            X[3] = X[0] - X[2]; // кут атаки

            // Вычисление перегрузки
            NY = C[7] * X[2];

            // Вычисление k1 (Метод Рунге-Кутта 4-го порядка)
            k1[0] = X[0];
            k1[1] = X[1];
            k1[2] = X[2];
            k1[3] = X[3];
            if (selectedControlLaw === 3) {
                k1[4] = DVD;
            }

            // Вычисление временных значений Y для k2
            for (let j = 0; j < Y.length; j++) {
                y_temp[j] = Y[j] + 0.5 * step * k1[j];
            }

            // Расчет X с временными Y для k2
            deltaM = -KS * y_temp[3];
            DV = DVS + deltaM + calculateDVD(y_temp);

            X[0] = y_temp[1];
            X[1] = -C[1] * y_temp[1] - C[2] * y_temp[3] - C[5] * X[3] - C[3] * DV;
            X[2] = C[4] * y_temp[3] + C[6] * DV;
            X[3] = X[0] - X[2];

            // Вычисление k2
            k2[0] = X[0];
            k2[1] = X[1];
            k2[2] = X[2];
            k2[3] = X[3];
            if (selectedControlLaw === 3) {
                k2[4] = DVD;
            }

            // Вычисление временных значений Y для k3
            for (let j = 0; j < Y.length; j++) {
                y_temp[j] = Y[j] + 0.5 * step * k2[j];
            }

            // Расчет X с временными Y для k3
            deltaM = -KS * y_temp[3];
            DV = DVS + deltaM + calculateDVD(y_temp);

            X[0] = y_temp[1];
            X[1] = -C[1] * y_temp[1] - C[2] * y_temp[3] - C[5] * X[3] - C[3] * DV;
            X[2] = C[4] * y_temp[3] + C[6] * DV;
            X[3] = X[0] - X[2];

            // Вычисление k3
            k3[0] = X[0];
            k3[1] = X[1];
            k3[2] = X[2];
            k3[3] = X[3];
            if (selectedControlLaw === 3) {
                k3[4] = DVD;
            }

            // Вычисление временных значений Y для k4
            for (let j = 0; j < Y.length; j++) {
                y_temp3[j] = Y[j] + step * k3[j];
            }

            // Расчет X с временными Y для k4
            deltaM = -KS * y_temp3[3];
            DV = DVS + deltaM + calculateDVD(y_temp3);

            X[0] = y_temp3[1];
            X[1] = -C[1] * y_temp3[1] - C[2] * y_temp3[3] - C[5] * X[3] - C[3] * DV;
            X[2] = C[4] * y_temp3[3] + C[6] * DV;
            X[3] = X[0] - X[2];

            // Вычисление k4
            k4[0] = X[0];
            k4[1] = X[1];
            k4[2] = X[2];
            k4[3] = X[3];
            if (selectedControlLaw === 3) {
                k4[4] = DVD;
            }

            // Итоговое обновление Y
            for (let j = 0; j < Y.length; j++) {
                Y[j] = Y[j] + (step / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]);
            }

            // Сохраняем результаты для графиков и таблиц
            timeValues.push(time);
            pitchValues.push(Y[0] * 180 / Math.PI); // перевод в градусы
            trajectoryAnglesValues.push(Y[2] * 180 / Math.PI);
            attackAnglesValues.push(Y[3] * 180 / Math.PI);
            nyValues.push(NY);
            
            // Фильтруем данные для отображения на графике и в таблице с шагом 0.5 секунд
            if (shouldIncludePoint(time)) {
                filteredTimePoints.push(time);
                filteredPitchPoints.push(Y[0] * 180 / Math.PI);
                filteredTrajectoryPoints.push(Y[2] * 180 / Math.PI);
                filteredAttackPoints.push(Y[3] * 180 / Math.PI);
                filteredNyPoints.push(NY);
            }
        }

        // Обновление графика с отфильтрованными точками
        chart.data.labels = filteredTimePoints;
        chart.data.datasets[0].data = filteredPitchPoints.map((value, index) => ({
            x: filteredTimePoints[index],
            y: value
        }));
        chart.data.datasets[1].data = filteredTrajectoryPoints.map((value, index) => ({
            x: filteredTimePoints[index],
            y: value
        }));
        chart.data.datasets[2].data = filteredAttackPoints.map((value, index) => ({
            x: filteredTimePoints[index],
            y: value
        }));
        chart.data.datasets[3].data = filteredNyPoints.map((value, index) => ({
            x: filteredTimePoints[index],
            y: value
        }));

        chart.update();

        // Обновление таблицы с отфильтрованными точками
        updateDataGrid(filteredTimePoints, filteredNyPoints);

        // Отображение коэффициентов
        displayCoefficients(C);
    }

    // Расчет балансировочных коэффициентов
    function calculateBalancedCoefficients() {
        clearData();
        
        const m = vmas[2] / vmas[9];
        const C = new Array(17).fill(0);
        
        // розр кофф
        C[1] = -(vmas[15] / vmas[4]) * vmas[0] * Math.pow(vmas[1], 2) * ((vmas[7] * vmas[5]) / 2);
        C[2] = -(vmas[17] / vmas[4]) * vmas[0] * vmas[1] * ((vmas[7] * Math.pow(vmas[5], 2)) / 2);
        C[3] = -(vmas[18] / vmas[4]) * vmas[0] * vmas[1] * ((vmas[7] * Math.pow(vmas[5], 2)) / 2);
        C[4] = ((vmas[11] + vmas[13]) / m) * vmas[0] * ((vmas[7] * vmas[5]) / 2);
        C[5] = -(vmas[19] / vmas[4]) * vmas[0] * vmas[1] * ((vmas[7] * Math.pow(vmas[5], 2)) / 2);
        C[6] = ((vmas[15]) / m) * vmas[0] * ((vmas[7] * vmas[5]) / 2);
        C[7] = (1 / vmas[9]) * (vmas[11] + vmas[13]) * vmas[0] * ((vmas[7] * vmas[5]) / 2);
        C[8] = (vmas[14] - vmas[3]) * (vmas[11] + vmas[13]) * vmas[0] * Math.pow(vmas[1], 2) * ((vmas[7] * vmas[5]) / 2);
        C[9] = ((vmas[3] - vmas[14]) * (vmas[15] + vmas[11] + vmas[13]) + vmas[15] * vmas[14]) * vmas[0] * Math.pow(vmas[1], 2) * ((vmas[7] * vmas[5]) / 2);
        C[10] = Math.pow(vmas[15], 2) * vmas[0] * Math.pow(vmas[1], 3) * ((vmas[7] * vmas[5]) / 2);
        C[11] = vmas[11] * vmas[0] * vmas[1] * ((vmas[7] * vmas[5]) / 2);
        C[12] = vmas[15] * vmas[0] * vmas[1] * ((vmas[7] * vmas[5]) / 2);
        C[13] = vmas[15] * vmas[16] * vmas[0] * Math.pow(vmas[1], 2) * ((vmas[7] * vmas[5]) / 2);
        C[14] = (vmas[15] * (vmas[14] - vmas[3]) + vmas[17]) * vmas[0] * Math.pow(vmas[1], 2) * ((vmas[7] * vmas[5]) / 2);
        C[15] = vmas[15] * vmas[18] * vmas[0] * Math.pow(vmas[1], 2) * ((vmas[7] * vmas[5]) / 2);
        C[16] = vmas[15] * vmas[19] * vmas[0] * Math.pow(vmas[1], 2) * ((vmas[7] * vmas[5]) / 2);

        // розр балансовача
        const c_ybal = vmas[10];
        const a_bal = c_ybal / vmas[11]; 
        const D_bal = -(vmas[12] * a_bal + vmas[13]) / vmas[15];
        
        // Показуємо балансувальні коефіцієнти
        displayCoefficients(C, { c_ybal, a_bal, D_bal });
    }

    // Додаємо обробники подій для кнопок вибору розрахунку
    document.getElementById('pitch-angle-btn').addEventListener('click', calculatePitchAngle);
    document.getElementById('trajectory-angle-btn').addEventListener('click', calculateTrajectoryAngle);
    document.getElementById('attack-angle-btn').addEventListener('click', calculateAttackAngle);
    document.getElementById('vertical-overload-btn').addEventListener('click', calculateVerticalOverload);
    document.getElementById('balanced-coefficients-btn').addEventListener('click', calculateBalancedCoefficients);

    // Додаємо обробники подій для кнопок вибору закону керування
    document.getElementById('control-law-1').addEventListener('click', function() {
        selectedControlLaw = 1;
        document.querySelectorAll('.control-law-btn').forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
    });

    document.getElementById('control-law-2').addEventListener('click', function() {
        selectedControlLaw = 2;
        document.querySelectorAll('.control-law-btn').forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
    });

    document.getElementById('control-law-3').addEventListener('click', function() {
        selectedControlLaw = 3;
        document.querySelectorAll('.control-law-btn').forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
    });

    // Изначально запускаем расчет угла тангажа
    calculatePitchAngle();
});