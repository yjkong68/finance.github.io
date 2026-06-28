/**
 * Smart Finance Calculator - Application Logic
 * Author: Antigravity
 * Date: 2026-05-31
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Theme and Tab Settings
    initTheme();
    initTabs();
    
    // Initialize Individual Calculators
    initStandardCalculator();
    initCompoundCalculator();
    initRetirementCalculator();
    initTargetWealthCalculator();
    initPortfolio();
    initPresetButtons();
    initShortcutModal();
});

/* ==========================================================================
   1. Theme & Navigation Tabs Logic
   ========================================================================== */

function initTheme() {
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const body = document.body;

    // Check saved theme or system preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'light') {
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
    } else if (savedTheme === 'dark') {
        body.classList.remove('light-theme');
        body.classList.add('dark-theme');
    } else {
        // Fallback to system preference (default is dark in CSS)
        if (!prefersDark) {
            body.classList.remove('dark-theme');
            body.classList.add('light-theme');
        }
    }

    // Toggle theme event
    themeToggleBtn.addEventListener('click', () => {
        if (body.classList.contains('dark-theme')) {
            body.classList.remove('dark-theme');
            body.classList.add('light-theme');
            localStorage.setItem('theme', 'light');
        } else {
            body.classList.remove('light-theme');
            body.classList.add('dark-theme');
            localStorage.setItem('theme', 'dark');
        }
        
        // Redraw charts to update colors based on theme
        updateAllChartsTheme();
    });
}

function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');

            // Deactivate all tabs
            tabButtons.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            tabContents.forEach(c => c.classList.remove('active'));

            // Activate target tab
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            const targetContent = document.getElementById(`tab-${tabId}`);
            if (targetContent) {
                targetContent.classList.add('active');
            }

            // Specific tab entry triggers
            if (tabId === 'compound') {
                setTimeout(() => {
                    if (window.myCompoundChart) window.myCompoundChart.resize();
                }, 50);
            } else if (tabId === 'target-wealth') {
                setTimeout(() => {
                    if (window.myTargetWealthChart) window.myTargetWealthChart.resize();
                }, 50);
            } else if (tabId === 'portfolio') {
                setTimeout(() => {
                    if (window.stockPieChartObj) window.stockPieChartObj.resize();
                    if (window.pensionPieChartObj) window.pensionPieChartObj.resize();
                }, 50);
            }
        });
    });
}


/* ==========================================================================
   2. Standard & Scientific Calculator Logic
   ========================================================================== */

function initStandardCalculator() {
    const formulaDisplay = document.getElementById('calc-formula');
    const inputDisplay = document.getElementById('calc-display');
    const toggleSciBtn = document.getElementById('toggle-sci-btn');
    const scientificPad = document.getElementById('scientific-pad');
    const historyItems = document.getElementById('history-items');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const keypad = document.getElementById('keypad-container');

    let currentInput = '0';
    let formula = '';
    let isCalculationDone = false;
    let isRadMode = false;
    let lastResult = '0';
    let history = JSON.parse(localStorage.getItem('calc_history') || '[]');

    // Render initial history
    renderHistory();

    // DEG/RAD Toggle buttons logic
    const btnDeg = document.getElementById('btn-deg-mode');
    const btnRad = document.getElementById('btn-rad-mode');

    if (btnDeg && btnRad) {
        btnDeg.addEventListener('click', () => {
            isRadMode = false;
            btnDeg.classList.add('active');
            btnRad.classList.remove('active');
        });

        btnRad.addEventListener('click', () => {
            isRadMode = true;
            btnRad.classList.add('active');
            btnDeg.classList.remove('active');
        });
    }

    // Toggle Scientific Pad
    toggleSciBtn.addEventListener('click', () => {
        const isHidden = scientificPad.classList.contains('hidden');
        if (isHidden) {
            scientificPad.classList.remove('hidden');
            toggleSciBtn.textContent = '공학용 키패드 숨기기';
        } else {
            scientificPad.classList.add('hidden');
            toggleSciBtn.textContent = '공학용 키패드 보이기';
        }
    });

    // Event Delegation for keypad buttons
    keypad.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        const val = btn.getAttribute('data-val');
        const action = btn.getAttribute('data-action');

        if (val) {
            handleValueInput(val);
        } else if (action) {
            handleActionInput(action);
        }
        updateDisplay();
    });

    // Keyboard bindings
    document.addEventListener('keydown', (e) => {
        // Only trigger when standard tab is active
        const standardTab = document.getElementById('tab-standard');
        if (!standardTab.classList.contains('active')) return;

        const key = e.key;

        if (/[0-9.]/.test(key)) {
            handleValueInput(key);
        } else if (key === '+') {
            handleValueInput('+');
        } else if (key === '-') {
            handleValueInput('-');
        } else if (key === '*') {
            handleValueInput('*');
        } else if (key === '/') {
            handleValueInput('/');
        } else if (key === '(' || key === ')') {
            handleValueInput(key);
        } else if (key === '%') {
            handleActionInput('percent');
        } else if (key === 'Enter' || key === '=') {
            e.preventDefault();
            handleActionInput('calculate');
        } else if (key === 'Backspace') {
            handleActionInput('backspace');
        } else if (key === 'Escape') {
            handleActionInput('clear');
        }
        updateDisplay();
    });

    function handleValueInput(val) {
        if (isCalculationDone) {
            // If previous calculation is done, start new formula unless operator is pressed
            if (['+', '-', '*', '/'].includes(val)) {
                formula = currentInput;
            } else {
                formula = '';
            }
            isCalculationDone = false;
        }

        // Standardize displaying constants
        if (val === 'PI') {
            formula += 'π';
            return;
        }
        if (val === 'E') {
            formula += 'e';
            return;
        }

        // Prevent multiple consecutive operators
        const lastChar = formula.slice(-1);
        if (['+', '-', '*', '/'].includes(val) && ['+', '-', '*', '/'].includes(lastChar)) {
            formula = formula.slice(0, -1) + val;
            return;
        }

        formula += val;
    }

    function handleActionInput(action) {
        switch (action) {
            case 'clear':
                formula = '';
                currentInput = '0';
                isCalculationDone = false;
                break;
            case 'backspace':
                if (isCalculationDone) {
                    formula = '';
                    isCalculationDone = false;
                } else if (formula.length > 0) {
                    // Check if deleting function string
                    const functions = ['sin(', 'cos(', 'tan(', 'log(', 'ln(', 'sqrt('];
                    let deletedFunc = false;
                    for (let func of functions) {
                        if (formula.endsWith(func)) {
                            formula = formula.slice(0, -func.length);
                            deletedFunc = true;
                            break;
                        }
                    }
                    if (!deletedFunc) {
                        formula = formula.slice(0, -1);
                    }
                }
                if (formula === '') {
                    currentInput = '0';
                }
                break;
            case 'percent':
                if (formula.length > 0 && !isCalculationDone) {
                    formula += '/100';
                }
                break;
            case 'calculate':
                evaluateFormula();
                break;
            case 'ans':
                if (isCalculationDone) {
                    formula = lastResult;
                    isCalculationDone = false;
                } else {
                    const lastChar = formula.slice(-1);
                    if (formula.length > 0 && !['+', '-', '*', '/', '('].includes(lastChar)) {
                        formula += '*' + lastResult;
                    } else {
                        formula += lastResult;
                    }
                }
                break;
            // Scientific Functions
            case 'sin':
            case 'cos':
            case 'tan':
            case 'log':
            case 'ln':
            case 'sqrt':
                if (isCalculationDone) {
                    formula = `${action}(`;
                    isCalculationDone = false;
                } else {
                    formula += `${action}(`;
                }
                break;
            case 'pow':
                if (formula.length > 0) {
                    formula += '^';
                }
                break;
            case 'fact':
                if (formula.length > 0) {
                    formula += '!';
                }
                break;
        }
    }

    function updateDisplay() {
        // Format display formula for pretty print (e.g. * to ×)
        let displayFormula = formula
            .replace(/\*/g, ' × ')
            .replace(/\//g, ' ÷ ')
            .replace(/-/g, ' − ')
            .replace(/\+/g, ' + ');

        formulaDisplay.textContent = displayFormula;
        inputDisplay.textContent = currentInput;
    }

    // Mathematical Evaluation
    function evaluateFormula() {
        if (!formula) return;

        try {
            let parsedFormula = formula;

            // Replace mathematical symbols for eval compatibility
            parsedFormula = parsedFormula.replace(/π/g, 'Math.PI');
            parsedFormula = parsedFormula.replace(/e/g, 'Math.E');

            // Handle trigonometry (Default: Degrees to Radians conversion)
            if (isRadMode) {
                parsedFormula = parsedFormula.replace(/sin\(([^)]+)\)/g, 'Math.sin($1)');
                parsedFormula = parsedFormula.replace(/cos\(([^)]+)\)/g, 'Math.cos($1)');
                parsedFormula = parsedFormula.replace(/tan\(([^)]+)\)/g, 'Math.tan($1)');
            } else {
                parsedFormula = parsedFormula.replace(/sin\(([^)]+)\)/g, 'Math.sin(($1) * Math.PI / 180)');
                parsedFormula = parsedFormula.replace(/cos\(([^)]+)\)/g, 'Math.cos(($1) * Math.PI / 180)');
                parsedFormula = parsedFormula.replace(/tan\(([^)]+)\)/g, 'Math.tan(($1) * Math.PI / 180)');
            }

            // Handle logarithmic & root
            parsedFormula = parsedFormula.replace(/log\(([^)]+)\)/g, 'Math.log10($1)');
            parsedFormula = parsedFormula.replace(/ln\(([^)]+)\)/g, 'Math.log($1)');
            parsedFormula = parsedFormula.replace(/sqrt\(([^)]+)\)/g, 'Math.sqrt($1)');

            // Power representation (e.g., 2^3 -> 2**3)
            parsedFormula = parsedFormula.replace(/\^/g, '**');

            // Factorial handler
            parsedFormula = parsedFormula.replace(/(\d+)!/g, (match, num) => {
                return factorial(parseInt(num));
            });

            // Clean brackets count (automatically append closing brackets if missed)
            const openBrackets = (parsedFormula.match(/\(/g) || []).length;
            const closeBrackets = (parsedFormula.match(/\)/g) || []).length;
            if (openBrackets > closeBrackets) {
                parsedFormula += ')'.repeat(openBrackets - closeBrackets);
            }

            // Safe evaluate using Function instead of direct eval
            const result = new Function(`return ${parsedFormula}`)();

            if (result === undefined || isNaN(result) || !isFinite(result)) {
                throw new Error('Invalid value');
            }

            // Format result (limit decimal points to avoid float issues)
            let formattedResult = Number(result.toFixed(10)).toString();
            
            // Add to history
            addHistoryItem(formula, formattedResult);

            currentInput = formattedResult;
            lastResult = formattedResult;
            isCalculationDone = true;
        } catch (error) {
            currentInput = '오류';
            isCalculationDone = true;
        }
    }

    function factorial(n) {
        if (n < 0) return NaN;
        if (n === 0 || n === 1) return 1;
        let res = 1;
        for (let i = 2; i <= n; i++) res *= i;
        return res;
    }

    // History List Operations
    function addHistoryItem(form, res) {
        history.unshift({ formula: form, result: res });
        // Max 20 history items
        if (history.length > 20) {
            history.pop();
        }
        localStorage.setItem('calc_history', JSON.stringify(history));
        renderHistory();
    }

    function renderHistory() {
        if (history.length === 0) {
            historyItems.innerHTML = '<div class="empty-state">최근 계산 기록이 없습니다.</div>';
            return;
        }

        historyItems.innerHTML = '';
        history.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <div class="hist-formula">${item.formula.replace(/\*/g, '×').replace(/\//g, '÷')}</div>
                <div class="hist-result">${item.result}</div>
            `;
            div.addEventListener('click', () => {
                formula = item.formula;
                currentInput = item.result;
                isCalculationDone = true;
                updateDisplay();
            });
            historyItems.appendChild(div);
        });
    }

    clearHistoryBtn.addEventListener('click', () => {
        history = [];
        localStorage.removeItem('calc_history');
        renderHistory();
    });
}


/* ==========================================================================
   3. Compound Interest Calculator Logic
   ========================================================================== */

function initCompoundCalculator() {
    // Inputs
    const initialInput = document.getElementById('comp-initial');
    const initialNumInput = document.getElementById('comp-initial-input');
    const monthlyInput = document.getElementById('comp-monthly');
    const monthlyNumInput = document.getElementById('comp-monthly-input');
    const rateInput = document.getElementById('comp-rate');
    const rateNumInput = document.getElementById('comp-rate-input');
    const yearsInput = document.getElementById('comp-years');
    const periodMonth = document.getElementById('comp-period-month');
    const periodYear = document.getElementById('comp-period-year');

    // Badges
    const yearsBadge = document.getElementById('comp-years-badge');

    // Results Display
    const resTotal = document.getElementById('res-comp-total');
    const resPrincipal = document.getElementById('res-comp-principal');
    const resInterest = document.getElementById('res-comp-interest');

    // Sync Slider and Number Input
    initialInput.addEventListener('input', () => {
        initialNumInput.value = initialInput.value;
    });

    initialNumInput.addEventListener('input', () => {
        let val = parseInt(initialNumInput.value) || 0;
        if (val < 0) val = 0;
        if (val > 50000) val = 50000;
        initialInput.value = val;
        calculateCompound();
    });

    monthlyInput.addEventListener('input', () => {
        monthlyNumInput.value = monthlyInput.value;
    });

    monthlyNumInput.addEventListener('input', () => {
        let val = parseInt(monthlyNumInput.value) || 0;
        if (val < 0) val = 0;
        if (val > 1000) val = 1000;
        monthlyInput.value = val;
        calculateCompound();
    });

    rateInput.addEventListener('input', () => {
        rateNumInput.value = rateInput.value;
    });

    rateNumInput.addEventListener('input', () => {
        let val = parseFloat(rateNumInput.value) || 0.1;
        if (val < 0.1) val = 0.1;
        if (val > 100) val = 100;
        rateInput.value = val;
        calculateCompound();
    });

    // Event Listeners for inputs
    const inputs = [initialInput, monthlyInput, rateInput, yearsInput];
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            updateBadges();
            calculateCompound();
        });
    });

    [periodMonth, periodYear].forEach(radio => {
        radio.addEventListener('change', calculateCompound);
    });

    // Formatting Korean currency
    function formatKoreanWon(valueInTenThousand) {
        if (valueInTenThousand === 0) return '0원';
        
        const Eok = Math.floor(valueInTenThousand / 10000);
        const Man = valueInTenThousand % 10000;

        let result = '';
        if (Eok > 0) {
            result += `${Eok}억 `;
        }
        if (Man > 0) {
            result += `${Man.toLocaleString()}만`;
        }
        return result.trim() + ' 원';
    }

    function updateBadges() {
        if (document.activeElement !== initialNumInput) {
            initialNumInput.value = initialInput.value;
        }
        if (document.activeElement !== monthlyNumInput) {
            monthlyNumInput.value = monthlyInput.value;
        }
        if (document.activeElement !== rateNumInput) {
            rateNumInput.value = rateInput.value;
        }
        yearsBadge.textContent = `${yearsInput.value} 년`;
    }

    function calculateCompound() {
        const P = parseInt(initialInput.value) * 10000; // Initial Principal
        const PMT = parseInt(monthlyInput.value) * 10000; // Monthly Contribution
        const r = parseFloat(rateInput.value) / 100; // Annual Rate
        const t = parseInt(yearsInput.value); // Years
        const isMonthlyCompound = periodMonth.checked;

        let principalData = [];
        let interestData = [];
        let labels = [];

        let currentBalance = P;
        let cumulativePrincipal = P;

        // Year-by-Year calculation loop
        for (let year = 1; year <= t; year++) {
            labels.push(`${year}년차`);

            if (isMonthlyCompound) {
                // Monthly Compounding Formula Applied Month-by-Month
                const monthlyRate = r / 12;
                for (let month = 1; month <= 12; month++) {
                    currentBalance = (currentBalance + PMT) * (1 + monthlyRate);
                    cumulativePrincipal += PMT;
                }
            } else {
                // Yearly Compounding: Monthly deposits made, interest applied at year-end
                for (let month = 1; month <= 12; month++) {
                    currentBalance += PMT;
                    cumulativePrincipal += PMT;
                }
                currentBalance = currentBalance * (1 + r);
            }

            const currentInterest = Math.max(0, currentBalance - cumulativePrincipal);

            principalData.push(Math.round(cumulativePrincipal / 10000));
            interestData.push(Math.round(currentInterest / 10000));
        }

        // Final values
        const finalBalanceVal = currentBalance;
        const finalPrincipalVal = cumulativePrincipal;
        const finalInterestVal = Math.max(0, finalBalanceVal - finalPrincipalVal);

        // Display results
        resTotal.textContent = formatKoreanWon(Math.round(finalBalanceVal / 10000));
        resPrincipal.textContent = formatKoreanWon(Math.round(finalPrincipalVal / 10000));
        resInterest.textContent = formatKoreanWon(Math.round(finalInterestVal / 10000));

        // Render Chart
        renderChart(labels, principalData, interestData);
    }

    function renderChart(labels, principalData, interestData) {
        const ctx = document.getElementById('compoundChart').getContext('2d');
        const theme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';

        const chartColors = {
            dark: {
                text: '#94a3b8',
                grid: 'rgba(255, 255, 255, 0.05)',
                principal: '#3b82f6',
                interest: '#10b981'
            },
            light: {
                text: '#475569',
                grid: 'rgba(0, 0, 0, 0.05)',
                principal: '#2563eb',
                interest: '#059669'
            }
        };

        const activeColors = chartColors[theme];

        if (window.myCompoundChart) {
            window.myCompoundChart.destroy();
        }

        window.myCompoundChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '원금 누적액 (만원)',
                        data: principalData,
                        backgroundColor: activeColors.principal,
                        borderWidth: 0,
                        stack: 'combined'
                    },
                    {
                        label: '수익 누적액 (만원)',
                        data: interestData,
                        backgroundColor: activeColors.interest,
                        borderWidth: 0,
                        stack: 'combined'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: activeColors.text,
                            font: {
                                family: 'Outfit, Noto Sans KR',
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        grid: {
                            color: activeColors.grid
                        },
                        ticks: {
                            color: activeColors.text,
                            font: {
                                family: 'Outfit, Noto Sans KR'
                            }
                        }
                    },
                    y: {
                        stacked: true,
                        grid: {
                            color: activeColors.grid
                        },
                        ticks: {
                            color: activeColors.text,
                            font: {
                                family: 'Outfit, Noto Sans KR'
                            },
                            callback: function(value) {
                                if (value >= 10000) {
                                    return (value / 10000) + '억원';
                                }
                                return value.toLocaleString() + '만';
                            }
                        }
                    }
                }
            }
        });
    }

    // Set initial values
    updateBadges();
    calculateCompound();
}

function updateAllChartsTheme() {
    // Helper to redraw all charts on theme change
    const compInitial = document.getElementById('comp-initial');
    if (compInitial) compInitial.dispatchEvent(new Event('input'));

    const targetWealth = document.getElementById('target-wealth-amount');
    if (targetWealth) targetWealth.dispatchEvent(new Event('input'));
    
    // Redraw portfolio charts
    if (typeof window.updatePortfolioCharts === 'function') {
        window.updatePortfolioCharts();
    }
}


/* ==========================================================================
   4. Retirement Planning (4% Rule) Calculator Logic
   ========================================================================== */

function initRetirementCalculator() {
    const expenseInput = document.getElementById('ret-expense');
    const currentInput = document.getElementById('ret-current');
    const savingInput = document.getElementById('ret-saving');
    const rateInput = document.getElementById('ret-rate');
    const swrInput = document.getElementById('ret-swr');

    const expenseBadge = document.getElementById('ret-expense-badge');
    const currentBadge = document.getElementById('ret-current-badge');
    const savingBadge = document.getElementById('ret-saving-badge');
    const rateBadge = document.getElementById('ret-rate-badge');
    const swrBadge = document.getElementById('ret-swr-badge');

    const resTarget = document.getElementById('res-ret-target');
    const resAnnualExp = document.getElementById('res-ret-annual-exp');
    const resSwrText = document.getElementById('res-ret-swr-text');
    const resGap = document.getElementById('res-ret-gap');
    const resYears = document.getElementById('res-ret-years');

    const inputs = [expenseInput, currentInput, savingInput, rateInput, swrInput];
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            updateBadges();
            calculateRetirement();
        });
    });

    function formatKoreanWon(valueInTenThousand) {
        if (valueInTenThousand === 0) return '0원';
        
        const Eok = Math.floor(valueInTenThousand / 10000);
        const Man = Math.round(valueInTenThousand % 10000);

        let result = '';
        if (Eok > 0) {
            result += `${Eok}억 `;
        }
        if (Man > 0) {
            result += `${Man.toLocaleString()}만`;
        }
        return result.trim() + ' 원';
    }

    function updateBadges() {
        expenseBadge.textContent = formatKoreanWon(parseInt(expenseInput.value));
        currentBadge.textContent = formatKoreanWon(parseInt(currentInput.value));
        savingBadge.textContent = formatKoreanWon(parseInt(savingInput.value));
        rateBadge.textContent = `${rateInput.value} %`;
        swrBadge.textContent = `${swrInput.value} %`;
    }

    function calculateRetirement() {
        const monthlyExp = parseInt(expenseInput.value) * 10000;
        const currentPortfolio = parseInt(currentInput.value) * 10000;
        const monthlySaving = parseInt(savingInput.value) * 10000;
        const r = parseFloat(rateInput.value) / 100;
        const swr = parseFloat(swrInput.value) / 100;

        // 1. Target Retirement Fund = Annual Expense / SWR
        const annualExpense = monthlyExp * 12;
        const targetFund = annualExpense / swr;

        // 2. Net Gap
        const gap = Math.max(0, targetFund - currentPortfolio);

        // Display basic elements
        resTarget.textContent = formatKoreanWon(Math.round(targetFund / 10000));
        resAnnualExp.textContent = formatKoreanWon(Math.round(annualExpense / 10000));
        resSwrText.textContent = swrInput.value;
        resGap.textContent = formatKoreanWon(Math.round(gap / 10000));

        // 3. Years to target fund (compound growth simulation)
        if (currentPortfolio >= targetFund) {
            resYears.textContent = '0 년 (이미 달성!)';
            resYears.parentElement.classList.add('success-card');
            return;
        }

        const monthlyRate = r / 12;
        let balance = currentPortfolio;
        let months = 0;
        const maxMonths = 1200; // Limit search to 100 years to prevent infinite loop

        while (balance < targetFund && months < maxMonths) {
            balance = (balance + monthlySaving) * (1 + monthlyRate);
            months++;
        }

        if (months >= maxMonths) {
            resYears.textContent = '도달 불가 (저축을 늘리거나 높은 수익률이 필요합니다)';
            resYears.parentElement.classList.remove('success-card');
        } else {
            const years = Math.floor(months / 12);
            const remainingMonths = months % 12;
            let displayTime = '';
            if (years > 0) {
                displayTime += `${years}년 `;
            }
            if (remainingMonths > 0) {
                displayTime += `${remainingMonths}개월`;
            }
            resYears.textContent = displayTime || '0개월';
            resYears.parentElement.classList.add('success-card');
        }
    }

    // Set Initial State
    updateBadges();
    calculateRetirement();
}




/* ==========================================================================
   6. Smart Features & Keyboard Shortcuts Logic
   ========================================================================== */

function initShortcutModal() {
    const guideBtn = document.getElementById('shortcut-guide-btn');
    const modal = document.getElementById('shortcut-modal');
    const closeBtn = document.getElementById('close-modal-btn');

    if (!guideBtn || !modal || !closeBtn) return;

    guideBtn.addEventListener('click', () => {
        modal.classList.remove('hidden');
    });

    closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });
}

function initPresetButtons() {
    const presetButtons = document.querySelectorAll('.btn-preset');
    presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const rate = btn.getAttribute('data-rate');
            const targetInput = document.getElementById(targetId);
            if (targetInput) {
                targetInput.value = rate;
                targetInput.dispatchEvent(new Event('input'));
            }
        });
    });
}

/* ==========================================================================
   7. Target Wealth Back-calculator Logic
   ========================================================================== */

function initTargetWealthCalculator() {
    const targetWealthInput = document.getElementById('target-wealth-amount');
    const targetWealthNumInput = document.getElementById('target-wealth-amount-input');
    const initialInput = document.getElementById('target-initial');
    const rateInput = document.getElementById('target-rate');
    const yearsInput = document.getElementById('target-years');
    const periodMonth = document.getElementById('target-period-month');
    const periodYear = document.getElementById('target-period-year');

    const initialBadge = document.getElementById('target-initial-badge');
    const rateBadge = document.getElementById('target-rate-badge');
    const yearsBadge = document.getElementById('target-years-badge');

    const resMonthly = document.getElementById('res-target-monthly');
    const resPrincipal = document.getElementById('res-target-principal');
    const resInterest = document.getElementById('res-target-interest');

    // Sync Slider and Number Input
    targetWealthInput.addEventListener('input', () => {
        targetWealthNumInput.value = targetWealthInput.value;
    });

    targetWealthNumInput.addEventListener('input', () => {
        let val = parseInt(targetWealthNumInput.value) || 0;
        if (val < 100) val = 100;
        if (val > 1000000) val = 1000000;
        targetWealthInput.value = val;
        calculateTargetWealth();
    });

    const inputs = [targetWealthInput, initialInput, rateInput, yearsInput];
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            updateBadges();
            calculateTargetWealth();
        });
    });

    [periodMonth, periodYear].forEach(radio => {
        radio.addEventListener('change', calculateTargetWealth);
    });

    function formatKoreanWon(valueInTenThousand) {
        if (valueInTenThousand === 0) return '0원';
        const Eok = Math.floor(valueInTenThousand / 10000);
        const Man = valueInTenThousand % 10000;
        let result = '';
        if (Eok > 0) result += `${Eok}억 `;
        if (Man > 0) result += `${Man.toLocaleString()}만`;
        return result.trim() + ' 원';
    }

    function updateBadges() {
        if (document.activeElement !== targetWealthNumInput) {
            targetWealthNumInput.value = targetWealthInput.value;
        }
        initialBadge.textContent = formatKoreanWon(parseInt(initialInput.value));
        rateBadge.textContent = `${rateInput.value} %`;
        yearsBadge.textContent = `${yearsInput.value} 년`;
    }

    function calculateTargetWealth() {
        const S = parseInt(targetWealthInput.value) * 10000; // Target Wealth in KRW
        const P = parseInt(initialInput.value) * 10000; // Initial Principal in KRW
        const r = parseFloat(rateInput.value) / 100; // Annual Rate
        const t = parseInt(yearsInput.value); // Years
        const isMonthly = periodMonth.checked;

        let PMT = 0;
        const n = t * 12; // Total months

        if (isMonthly) {
            const rm = r / 12;
            const compoundFactor = Math.pow(1 + rm, n);
            const futureP = P * compoundFactor;

            if (futureP >= S) {
                PMT = 0;
            } else {
                const numerator = S - futureP;
                const denominator = (1 + rm) * (compoundFactor - 1) / rm;
                PMT = numerator / denominator;
            }
        } else {
            const compoundFactor = Math.pow(1 + r, t);
            const futureP = P * compoundFactor;

            if (futureP >= S) {
                PMT = 0;
            } else {
                const numerator = S - futureP;
                const denominator = 12 * (1 + r) * (compoundFactor - 1) / r;
                PMT = numerator / denominator;
            }
        }

        PMT = Math.max(0, Math.round(PMT));

        let principalData = [];
        let interestData = [];
        let labels = [];

        let currentBalance = P;
        let cumulativePrincipal = P;

        for (let year = 1; year <= t; year++) {
            labels.push(`${year}년차`);

            if (isMonthly) {
                const rm = r / 12;
                for (let month = 1; month <= 12; month++) {
                    currentBalance = (currentBalance + PMT) * (1 + rm);
                    cumulativePrincipal += PMT;
                }
            } else {
                for (let month = 1; month <= 12; month++) {
                    currentBalance += PMT;
                    cumulativePrincipal += PMT;
                }
                currentBalance = currentBalance * (1 + r);
            }

            const currentInterest = Math.max(0, currentBalance - cumulativePrincipal);
            principalData.push(Math.round(cumulativePrincipal / 10000));
            interestData.push(Math.round(currentInterest / 10000));
        }

        const finalTotal = currentBalance;
        const finalPrincipal = cumulativePrincipal;
        const finalInterest = Math.max(0, finalTotal - finalPrincipal);

        resMonthly.textContent = PMT === 0 ? '0 원 (이미 거치금만으로 달성 가능)' : `${Math.round(PMT).toLocaleString()} 원`;
        resPrincipal.textContent = formatKoreanWon(Math.round(finalPrincipal / 10000));
        resInterest.textContent = formatKoreanWon(Math.round(finalInterest / 10000));

        renderTargetChart(labels, principalData, interestData);
    }

    function renderTargetChart(labels, principalData, interestData) {
        const canvas = document.getElementById('targetWealthChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const theme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';

        const chartColors = {
            dark: {
                text: '#94a3b8',
                grid: 'rgba(255, 255, 255, 0.05)',
                principal: '#3b82f6',
                interest: '#a855f7'
            },
            light: {
                text: '#475569',
                grid: 'rgba(0, 0, 0, 0.05)',
                principal: '#2563eb',
                interest: '#7c3aed'
            }
        };

        const activeColors = chartColors[theme];

        if (window.myTargetWealthChart) {
            window.myTargetWealthChart.destroy();
        }

        window.myTargetWealthChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '원금 누적액 (만원)',
                        data: principalData,
                        borderColor: activeColors.principal,
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        tension: 0.1
                    },
                    {
                        label: '이자 누적액 (만원)',
                        data: interestData,
                        borderColor: activeColors.interest,
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: activeColors.text,
                            font: { family: 'Outfit, Noto Sans KR', size: 12 }
                        }
                    },
                    tooltip: { mode: 'index', intersect: false }
                },
                scales: {
                    x: {
                        grid: { color: activeColors.grid },
                        ticks: { color: activeColors.text, font: { family: 'Outfit, Noto Sans KR' } }
                    },
                    y: {
                        grid: { color: activeColors.grid },
                        ticks: {
                            color: activeColors.text,
                            font: { family: 'Outfit, Noto Sans KR' },
                            callback: function(value) {
                                if (value >= 10000) return (value / 10000) + '억원';
                                return value.toLocaleString() + '만';
                            }
                        }
                    }
                }
            }
        });
    }

    updateBadges();
    calculateTargetWealth();
}

/* ==========================================================================
   8. Investment Portfolio Logic
   ========================================================================== */

function initPortfolio() {
    const stockData = [
        { name: '삼성전자', category: '단일종목', subcategory: '주운용종목', avgPrice: 312759, quantity: 65, purchaseCost: 20329393, currentVal: 22067500, profit: 1738107, rate: 0.08549724, ratio: 0.64651542, note: '반도체 주도주', color: '#3b82f6' },
        { name: 'KODEX SK하이닉스단일종목레버리지', category: '단일종목', subcategory: '주운용종목', avgPrice: 35344, quantity: 76, purchaseCost: 2686210, currentVal: 2625420, profit: -60790, rate: -0.0226304, ratio: 0.07691739, note: '', color: '#60a5fa' },
        { name: 'KODEX 삼성전자단일종목레버리지', category: '단일종목', subcategory: '주운용종목', avgPrice: 24305, quantity: 111, purchaseCost: 2697963, currentVal: 2771670, profit: 73707, rate: 0.0273195, ratio: 0.0812021, note: '', color: '#2563eb' },
        { name: '두산에너빌리티', category: '단일종목', subcategory: '분산 종목', avgPrice: 101381, quantity: 27, purchaseCost: 2737300, currentVal: 2189700, profit: -547600, rate: -0.2000511, ratio: 0.06415203, note: '소형 원자로/전력', color: '#f59e0b' },
        { name: '툴젠', category: '단일종목', subcategory: '분산 종목', avgPrice: 67455, quantity: 18, purchaseCost: 1214200, currentVal: 748800, profit: -465400, rate: -0.3832976, ratio: 0.02193773, note: '바이오, 유상증자', color: '#ec4899' },
        { name: 'TIGER 미국우주테크', category: '지수ETF', subcategory: '분산 종목', avgPrice: 9532, quantity: 130, purchaseCost: 1239275, currentVal: 1189500, profit: -49775, rate: -0.0401646, ratio: 0.03484899, note: '', color: '#10b981' },
        { name: '예수금', category: '예수금', subcategory: '', avgPrice: null, quantity: null, purchaseCost: null, currentVal: 2540393, profit: null, rate: null, ratio: 0.07442634, note: '', color: '#64748b' }
    ];

    const pensionData = [
        { name: 'ACE 미국S&P500미국채혼합50액티브', category: '현금(30%)', subcategory: '현금성', avgPrice: 15424, quantity: 92, purchaseCost: 1419063, currentVal: 1398400, profit: -20663, rate: -0.01456102, ratio: 0.01150153, note: '', color: '#a855f7' },
        { name: 'RISE 삼성전자SK하이닉스채권혼합50', category: '현금(30%)', subcategory: '투자성', avgPrice: 14351, quantity: 2413, purchaseCost: 34629257, currentVal: 37642800, profit: 3013543, rate: 0.08702303, ratio: 0.30960365, note: '', color: '#8b5cf6' },
        { name: 'KODEX 200', category: '투자(70%)', subcategory: '주운용종목', avgPrice: 128934, quantity: 501, purchaseCost: 64596414, currentVal: 68827380, profit: 4230966, rate: 0.06549847, ratio: 0.56608988, note: '', color: '#3b82f6' },
        { name: 'TIGER 미국S&P500', category: '투자(70%)', subcategory: '현금성(안정)', avgPrice: 28311, quantity: 154, purchaseCost: 4360027, currentVal: 4295060, profit: -64967, rate: -0.0149006, ratio: 0.03532591, note: '매도금액 매수', color: '#10b981' },
        { name: 'TIGER 미국나스닥100', category: '투자(70%)', subcategory: '현금성(변동)', avgPrice: 198743, quantity: 1, purchaseCost: 198743, currentVal: 197725, profit: -1018, rate: -0.00512219, ratio: 0.00162624, note: '', color: '#06b6d4' },
        { name: 'TIGER 미국우주테크', category: '투자(70%)', subcategory: '분산 종목', avgPrice: 15962, quantity: 485, purchaseCost: 7742020, currentVal: 4437750, profit: -3304270, rate: -0.42679688, ratio: 0.03649951, note: '', color: '#f43f5e' },
        { name: 'TIGER 리츠부동산인프라', category: '투자(70%)', subcategory: '분산 종목', avgPrice: 4335, quantity: 1193, purchaseCost: 5171655, currentVal: 4777965, profit: -393690, rate: -0.07612457, ratio: 0.0392977, note: '', color: '#f59e0b' },
        { name: '보유 현금', category: '보유 현금', subcategory: '', avgPrice: null, quantity: null, purchaseCost: 6758, currentVal: 6758, profit: null, rate: null, ratio: 0.00005558, note: '', color: '#64748b' }
    ];

    function formatNumber(num) {
        if (num === null || num === undefined) return '-';
        return Math.round(num).toLocaleString();
    }

    function formatPercent(val) {
        if (val === null || val === undefined) return '-';
        return (val * 100).toFixed(2) + '%';
    }

    function formatProfitRate(val) {
        if (val === null || val === undefined) return '-';
        const percent = (val * 100).toFixed(2);
        if (val > 0) return `<span class="pos-text">+${percent}%</span>`;
        if (val < 0) return `<span class="neg-text">${percent}%</span>`;
        return `<span>${percent}%</span>`;
    }

    // Dom elements
    const totalEvalEl = document.getElementById('total-eval-val');
    const totalProfitEl = document.getElementById('total-profit-val');
    const totalRateEl = document.getElementById('total-rate-val');

    const stockEvalEl = document.getElementById('stock-total-eval');
    const stockRateEl = document.getElementById('stock-total-rate');
    const pensionEvalEl = document.getElementById('pension-total-eval');
    const pensionRateEl = document.getElementById('pension-total-rate');

    const stockBody = document.getElementById('stock-portfolio-body');
    const pensionBody = document.getElementById('pension-portfolio-body');

    // Totals calculations
    const stockTotalEvalVal = 34132983; // H14
    const stockTotalRateVal = 0.0222703; // J14
    const pensionTotalEvalVal = 121583838; // H27
    const pensionTotalRateVal = 0.4235998; // J28 (퇴직원금 대비)
    const pensionPurchaseRateVal = 0.0292921; // J27 (매입원가 대비)

    const grandTotalEvalVal = stockTotalEvalVal + pensionTotalEvalVal; // H30 = 155,716,821
    const grandTotalProfitVal = 4148150; // I30 = 688,249 (주식) + 3,459,901 (연금)
    const grandTotalRateVal = stockTotalRateVal + pensionTotalRateVal; // J30 = 44.59%

    // Populate Headers
    if (totalEvalEl) totalEvalEl.textContent = formatNumber(grandTotalEvalVal) + ' 원';
    if (totalProfitEl) {
        totalProfitEl.innerHTML = grandTotalProfitVal > 0 ? 
            `<span class="pos-text">+${formatNumber(grandTotalProfitVal)} 원</span>` : 
            `<span class="neg-text">${formatNumber(grandTotalProfitVal)} 원</span>`;
    }
    if (totalRateEl) totalRateEl.innerHTML = `<span class="pos-text">+${(grandTotalRateVal * 100).toFixed(2)}%</span>`;

    if (stockEvalEl) stockEvalEl.textContent = formatNumber(stockTotalEvalVal) + ' 원';
    if (stockRateEl) stockRateEl.innerHTML = formatProfitRate(stockTotalRateVal);

    if (pensionEvalEl) pensionEvalEl.textContent = formatNumber(pensionTotalEvalVal) + ' 원';
    if (pensionRateEl) {
        pensionRateEl.innerHTML = `<span class="pos-text">+${(pensionTotalRateVal * 100).toFixed(2)}%</span> <span class="badge-unit-text" style="font-size:0.75rem; color:var(--text-muted);">(원금대비)</span> / ${formatProfitRate(pensionPurchaseRateVal)} <span class="badge-unit-text" style="font-size:0.75rem; color:var(--text-muted);">(매입대비)</span>`;
    }

    // Render Tables
    function renderTables() {
        if (stockBody) {
            stockBody.innerHTML = '';
            stockData.forEach(item => {
                const tr = document.createElement('tr');
                const unitCurrent = item.quantity ? item.currentVal / item.quantity : null;
                tr.innerHTML = `
                    <td>
                        <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background-color:${item.color}; margin-right:8px;"></span>
                        <strong>${item.name}</strong>
                    </td>
                    <td class="num-col">${formatNumber(item.currentVal)} 원</td>
                    <td class="num-col">${formatPercent(item.ratio)}</td>
                    <td class="num-col">${item.avgPrice ? formatNumber(item.avgPrice) + ' 원' : '-'}</td>
                    <td class="num-col">${unitCurrent ? formatNumber(unitCurrent) + ' 원' : '-'}</td>
                    <td class="num-col">${item.quantity ? formatNumber(item.quantity) + ' 주' : '-'}</td>
                    <td class="num-col">${formatProfitRate(item.rate)}</td>
                `;
                stockBody.appendChild(tr);
            });
        }

        if (pensionBody) {
            pensionBody.innerHTML = '';
            pensionData.forEach(item => {
                const tr = document.createElement('tr');
                const unitCurrent = item.quantity ? item.currentVal / item.quantity : null;
                tr.innerHTML = `
                    <td>
                        <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background-color:${item.color}; margin-right:8px;"></span>
                        <strong>${item.name}</strong>
                    </td>
                    <td class="num-col">${formatNumber(item.currentVal)} 원</td>
                    <td class="num-col">${formatPercent(item.ratio)}</td>
                    <td class="num-col">${item.avgPrice ? formatNumber(item.avgPrice) + ' 원' : '-'}</td>
                    <td class="num-col">${unitCurrent ? formatNumber(unitCurrent) + ' 원' : '-'}</td>
                    <td class="num-col">${item.quantity ? formatNumber(item.quantity) + ' 주' : '-'}</td>
                    <td class="num-col">${formatProfitRate(item.rate)}</td>
                `;
                pensionBody.appendChild(tr);
            });
        }
    }

    // Render Charts
    function renderCharts() {
        const theme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
        const activeColors = {
            dark: {
                text: '#f8fafc',
                border: 'rgba(255, 255, 255, 0.08)'
            },
            light: {
                text: '#0f172a',
                border: 'rgba(0, 0, 0, 0.06)'
            }
        }[theme];

        // 1. Stock Pie Chart
        const stockCanvas = document.getElementById('stockPieChart');
        if (stockCanvas) {
            const ctx = stockCanvas.getContext('2d');
            if (window.stockPieChartObj) window.stockPieChartObj.destroy();
            window.stockPieChartObj = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: stockData.map(d => d.name),
                    datasets: [{
                        data: stockData.map(d => d.currentVal),
                        backgroundColor: stockData.map(d => d.color),
                        borderColor: activeColors.border,
                        borderWidth: 1.5
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const val = context.raw;
                                    const percentage = (val / stockTotalEvalVal * 100).toFixed(2);
                                    return ` ${context.label}: ${val.toLocaleString()} 원 (${percentage}%)`;
                                }
                            }
                        }
                    },
                    cutout: '70%'
                }
            });
        }

        // 2. Pension Pie Chart
        const pensionCanvas = document.getElementById('pensionPieChart');
        if (pensionCanvas) {
            const ctx = pensionCanvas.getContext('2d');
            if (window.pensionPieChartObj) window.pensionPieChartObj.destroy();
            window.pensionPieChartObj = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: pensionData.map(d => d.name),
                    datasets: [{
                        data: pensionData.map(d => d.currentVal),
                        backgroundColor: pensionData.map(d => d.color),
                        borderColor: activeColors.border,
                        borderWidth: 1.5
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const val = context.raw;
                                    const percentage = (val / pensionTotalEvalVal * 100).toFixed(2);
                                    return ` ${context.label}: ${val.toLocaleString()} 원 (${percentage}%)`;
                                }
                            }
                        }
                    },
                    cutout: '70%'
                }
            });
        }
    }

    renderTables();
    renderCharts();

    // Expose redraw function
    window.updatePortfolioCharts = function() {
        renderCharts();
    };
}
