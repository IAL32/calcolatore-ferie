<script lang="ts">
    import type { BalanceReport } from "../calculator";

    interface Props {
        report: BalanceReport;
    }

    let { report }: Props = $props();

    function fmtH(h: number) {
        return `${h.toFixed(2)} h`;
    }

    function fmtD(h: number) {
        const d = h / 8.0;
        return `${d.toFixed(2)} gg`;
    }
</script>

<!-- Balance Cards Grid -->
<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
    <!-- Card: Ferie -->
    <div
        class="bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl hover:shadow-indigo-500/10 transition-all duration-300"
    >
        <h2
            class="text-indigo-300 text-sm font-semibold uppercase tracking-wider mb-4"
        >
            Ferie
        </h2>
        <div class="space-y-4">
            <div>
                <div class="text-slate-400 text-xs uppercase mb-1">
                    Maturate
                </div>
                <div class="text-2xl font-mono text-white">
                    {fmtH(report.ferie_earned)}
                </div>
                <div class="text-xs text-slate-500">
                    {fmtD(report.ferie_earned)}
                </div>
            </div>
            <div>
                <div class="text-slate-400 text-xs uppercase mb-1">Residuo</div>
                <div
                    class="{report.ferie_rem < 0
                        ? 'text-red-400'
                        : 'text-emerald-400'} text-3xl font-bold font-mono"
                >
                    {fmtH(report.ferie_rem)}
                </div>
                <div class="text-xs text-slate-500">
                    {fmtD(report.ferie_rem)}
                </div>
            </div>
        </div>
    </div>

    <!-- Card: PAR -->
    <div
        class="bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl hover:shadow-purple-500/10 transition-all duration-300"
    >
        <h2
            class="text-purple-300 text-sm font-semibold uppercase tracking-wider mb-4"
        >
            PAR
        </h2>
        <div class="space-y-4">
            <div>
                <div class="text-slate-400 text-xs uppercase mb-1">
                    Maturati
                </div>
                <div class="text-2xl font-mono text-white">
                    {fmtH(report.par_earned)}
                </div>
                <div class="text-xs text-slate-500">
                    {fmtD(report.par_earned)}
                </div>
            </div>
            <div>
                <div class="text-slate-400 text-xs uppercase mb-1">Residuo</div>
                <div
                    class="{report.par_rem < 0
                        ? 'text-red-400'
                        : 'text-emerald-400'} text-3xl font-bold font-mono"
                >
                    {fmtH(report.par_rem)}
                </div>
                <div class="text-xs text-slate-500">
                    {fmtD(report.par_rem)}
                </div>
            </div>
        </div>
    </div>

    <!-- Card: Total -->
    <div
        class="relative bg-gradient-to-br from-slate-800 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl overflow-hidden group"
    >
        <div
            class="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        ></div>
        <h2
            class="text-white text-sm font-semibold uppercase tracking-wider mb-4 relative z-10"
        >
            Totale Dispo.
        </h2>
        <div class="space-y-4 relative z-10">
            <div>
                <div class="text-slate-400 text-xs uppercase mb-1">
                    Usate Totali
                </div>
                <div class="text-2xl font-mono text-white">
                    {fmtH(report.used)}
                </div>
                <div class="text-xs text-slate-500">{fmtD(report.used)}</div>
            </div>
            <div>
                <div class="text-slate-400 text-xs uppercase mb-1">
                    Saldo Finale
                </div>
                <div
                    class="{report.total_rem < 0
                        ? 'text-red-400'
                        : 'text-emerald-400'} text-4xl font-bold font-mono"
                >
                    {fmtH(report.total_rem)}
                </div>
                <div class="text-xs text-slate-500">
                    {fmtD(report.total_rem)}
                </div>
            </div>
        </div>
    </div>
</div>
