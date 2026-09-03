import { auth } from "./config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { apiFetch } from "./apiClient.js";
import { verificarParcelasPendentes } from "./notifications.js";

// ─── helpers de período ────────────────────────────────────────────────────

/** Retorna YYYY-MM do mês atual */
function mesAtual() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Monta a query string com base nos controles do filtro */
function montarQueryPeriodo() {
    const modo = document.getElementById("modoFiltro")?.value || "mes";

    if (modo === "ano") {
        const ano = document.getElementById("inputAno")?.value;
        return ano ? `?ano=${ano}` : "";
    }

    if (modo === "periodo") {
        const inicio = document.getElementById("inputMesInicio")?.value;
        const fim    = document.getElementById("inputMesFim")?.value;
        return (inicio && fim) ? `?mesInicio=${inicio}&mesFim=${fim}` : "";
    }

    // modo "mes" (default)
    const mes = document.getElementById("inputMes")?.value || mesAtual();
    return `?mes=${mes}`;
}

/** Texto legível do período selecionado */
function labelPeriodo() {
    const modo = document.getElementById("modoFiltro")?.value || "mes";
    const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

    if (modo === "ano") {
        const ano = document.getElementById("inputAno")?.value;
        return ano ? `Exibindo: ${ano}` : "";
    }

    if (modo === "periodo") {
        const inicio = document.getElementById("inputMesInicio")?.value;
        const fim    = document.getElementById("inputMesFim")?.value;
        if (!inicio || !fim) return "";
        const fmt = (v) => { const [a, m] = v.split("-"); return `${meses[+m-1]}/${a}`; };
        return `Exibindo: ${fmt(inicio)} até ${fmt(fim)}`;
    }

    const mes = document.getElementById("inputMes")?.value || mesAtual();
    const [ano, m] = mes.split("-");
    return `Exibindo: ${meses[+m-1]}/${ano}`;
}

// ─── carregamento dos dados ────────────────────────────────────────────────

async function carregarDashboard(uid) {
    try {
        const query = montarQueryPeriodo();
        const res = await apiFetch(`/dashboard/${uid}${query}`);

        if (res.status === 401) { window.location.href = "cad.html"; return; }
        if (!res.ok) { console.error("Erro na requisição da dashboard:", res.status); return; }

        const data = await res.json();

        const elSaldo    = document.getElementById("saldo");
        const elReceitas = document.getElementById("receitas");
        const elGastos   = document.getElementById("gastos");

        if (elSaldo)    elSaldo.innerText    = `R$ ${(Number(data.saldo)    || 0).toFixed(2)}`;
        if (elReceitas) elReceitas.innerText = `R$ ${(Number(data.receitas) || 0).toFixed(2)}`;
        if (elGastos)   elGastos.innerText   = `R$ ${(Number(data.gastos)  || 0).toFixed(2)}`;

        const label = document.getElementById("labelPeriodo");
        if (label) label.innerText = labelPeriodo();
    } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
    }
}

async function carregarInvestimentosResumo(uid) {
    try {
        const res = await apiFetch(`/api/investimentos/cotacoes/${uid}`);

        if (res.status === 401) { window.location.href = "cad.html"; return; }
        if (!res.ok) { console.error("Erro na requisição de investimentos:", res.status); return; }

        const data = await res.json();

        const elPatrimonio = document.getElementById("patrimonioInvestido");
        const elRendimentos = document.getElementById("rendimentos");
        const elStatus = document.getElementById("statusRendimento");
        const elProventos = document.getElementById("proximosProventos");

        if (elPatrimonio) {
            elPatrimonio.innerText = `R$ ${(Number(data.valorAtual) || 0).toLocaleString("pt-BR", {
                minimumFractionDigits: 2
            })}`;
        }

        if (elRendimentos) {
            elRendimentos.innerText = `R$ ${(Number(data.rendimento) || 0).toLocaleString("pt-BR", {
                minimumFractionDigits: 2
            })}`;
        }

        if (elProventos) {
            elProventos.innerText = `R$ ${(parseFloat(data.proximosProventos) || 0).toLocaleString("pt-BR", {
                minimumFractionDigits: 2
            })} (estimado)`;
            elProventos.title = "Valor estimado com base nos últimos proventos anunciados. Pode variar até a data de pagamento.";
        }

        if (elStatus) {
            const perc = parseFloat(data.crescimentoPercentual) || 0;
            elStatus.innerText = `${perc >= 0 ? "+" : ""}${perc.toFixed(2)}%`;
            elStatus.style.color = perc >= 0 ? "#10B981" : "#EF4444";
        }
    } catch (error) {
        console.error("Erro ao carregar resumo de investimentos:", error);
    }
}

async function carregarGraficoRendimento(uid) {
    try {
        const res = await apiFetch(`/api/investimentos/historico/${uid}`);

        if (res.status === 401) { window.location.href = "cad.html"; return; }
        if (!res.ok) return;

        const historico = await res.json();
        const canvas = document.getElementById("graficoRendimento");

        if (!canvas || !Array.isArray(historico) || historico.length === 0) return;

        const labels = historico.map(h => {
            const [ano, mes, dia] = h.data.split("-");
            return `${dia}/${mes}`;
        });

        new Chart(canvas, {
            type: "line",
            data: {
                labels,
                datasets: [
                    {
                        label: "Valor da Carteira (R$)",
                        data: historico.map(h => h.valor_atual),
                        borderColor: "#6FE7DD",
                        backgroundColor: "rgba(111, 231, 221, 0.15)",
                        fill: true,
                        tension: 0.3
                    },
                    {
                        label: "Rendimento (R$)",
                        data: historico.map(h => h.rendimento),
                        borderColor: "#10B981",
                        backgroundColor: "rgba(16, 185, 129, 0.1)",
                        fill: true,
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { labels: { color: "#fff" } }
                },
                scales: {
                    x: { ticks: { color: "#8FA1A3" } },
                    y: { ticks: { color: "#8FA1A3" } }
                }
            }
        });
    } catch (error) {
        console.error("Erro ao carregar gráfico de rendimento:", error);
    }
}

// Instância do gráfico de pizza — guardada para destruir antes de recriar ao filtrar
let chartGastos = null;

async function carregarGrafico(uid) {
    try {
        const query = montarQueryPeriodo();
        const res = await apiFetch(`/estatisticas/${uid}${query}`);

        if (res.status === 401) { window.location.href = "cad.html"; return; }
        if (!res.ok) return;

        const dados = await res.json();
        const canvas = document.getElementById("graficoGastos");

        if (!canvas || !Array.isArray(dados)) return;

        // Destrói o gráfico anterior para evitar sobreposição ao filtrar
        if (chartGastos) {
            chartGastos.destroy();
            chartGastos = null;
        }

        if (dados.length === 0) {
            // Nenhum gasto no período
            const ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#8FA1A3";
            ctx.font = "14px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("Sem gastos no período", canvas.width / 2, canvas.height / 2);
            return;
        }

        chartGastos = new Chart(canvas, {
            type: "pie",
            data: {
                labels: dados.map(item => item.categoria),
                datasets: [{ data: dados.map(item => item.total) }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { labels: { color: "#fff" } }
                }
            }
        });
    } catch (error) {
        console.error("Erro ao carregar gráfico de gastos:", error);
    }
}

// ─── controles do filtro ───────────────────────────────────────────────────

function inicializarFiltros(uid) {
    const inputMes      = document.getElementById("inputMes");
    const modoFiltro    = document.getElementById("modoFiltro");
    const grupoMes      = document.getElementById("grupoMes");
    const grupoPeriodo  = document.getElementById("grupoPeriodo");
    const grupoAno      = document.getElementById("grupoAno");
    const inputAno      = document.getElementById("inputAno");
    const btnFiltrar    = document.getElementById("btnFiltrar");

    // Inicializa com o mês atual
    if (inputMes) inputMes.value = mesAtual();
    if (inputAno) inputAno.value = new Date().getFullYear();

    // Troca os grupos visíveis ao mudar o modo
    modoFiltro?.addEventListener("change", () => {
        const modo = modoFiltro.value;
        grupoMes.style.display     = modo === "mes"     ? "" : "none";
        grupoPeriodo.style.display = modo === "periodo" ? "flex" : "none";
        grupoAno.style.display     = modo === "ano"     ? "" : "none";
    });

    // Ao clicar em Filtrar, recarrega dashboard e gráfico de pizza
    btnFiltrar?.addEventListener("click", () => {
        carregarDashboard(uid);
        carregarGrafico(uid);
    });
}

// ─── inicialização ─────────────────────────────────────────────────────────

onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = "cad.html"; return; }

    inicializarFiltros(user.uid);

    try {
        await Promise.allSettled([
            carregarDashboard(user.uid),
            carregarInvestimentosResumo(user.uid),
            carregarGraficoRendimento(user.uid),
            carregarGrafico(user.uid)
        ]);

        verificarParcelasPendentes();
    } catch (error) {
        console.error("Erro ao sincronizar dados da aplicação:", error);
    }
});


