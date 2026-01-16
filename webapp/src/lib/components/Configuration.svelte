<script lang="ts">
    import type { Province } from "../calculator";

    interface Props {
        startStr: string;
        asOfStr: string;
        ferieYearly: number;
        parYearly: number;
        province: Province;
        onExportData: () => void;
        onImportData: (e: Event) => void;
        onResetData: () => void;
    }

    let {
        startStr = $bindable(),
        asOfStr = $bindable(),
        ferieYearly = $bindable(),
        parYearly = $bindable(),
        province = $bindable(),
        onExportData,
        onImportData,
        onResetData,
    }: Props = $props();
</script>

<section class="bg-slate-800/30 border border-white/5 rounded-2xl p-6">
    <h3 class="text-lg font-semibold text-white mb-4">Configurazione</h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-2">
            <label
                for="start-date"
                class="block text-xs font-medium text-slate-400 uppercase"
                >Inizio Maturazione</label
            >
            <input
                id="start-date"
                type="date"
                bind:value={startStr}
                class="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            />
        </div>
        <div class="space-y-2">
            <label
                for="as-of-date"
                class="block text-xs font-medium text-slate-400 uppercase"
                >Data Calcolo (Oggi)</label
            >
            <input
                id="as-of-date"
                type="date"
                bind:value={asOfStr}
                class="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            />
        </div>
        <div class="space-y-2">
            <label
                for="ferie-yearly"
                class="block text-xs font-medium text-slate-400 uppercase"
                >Ore Ferie / Anno</label
            >
            <input
                id="ferie-yearly"
                type="number"
                step="0.5"
                bind:value={ferieYearly}
                class="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            />
        </div>
        <div class="space-y-2">
            <label
                for="par-yearly"
                class="block text-xs font-medium text-slate-400 uppercase"
                >Ore PAR / Anno</label
            >
            <input
                id="par-yearly"
                type="number"
                step="0.5"
                bind:value={parYearly}
                class="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            />
        </div>
        <div class="space-y-2">
            <label
                for="province-select"
                class="block text-xs font-medium text-slate-400 uppercase"
                >Provincia</label
            >
            <select
                id="province-select"
                bind:value={province}
                class="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all appearance-none"
            >
                <option value="MI">Milano</option>
                <option value="IT">Altro (Nazionale)</option>
            </select>
        </div>
    </div>

    <!-- Import/Export -->
    <div
        class="mt-6 pt-6 border-t border-white/5 flex justify-between items-center"
    >
        <div class="flex gap-4">
            <button
                onclick={onExportData}
                class="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm font-medium transition-colors"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                </svg>
                Esporta CSV
            </button>
            <label
                class="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                    />
                </svg>
                Importa CSV
                <input
                    type="file"
                    accept=".csv"
                    onchange={onImportData}
                    class="hidden"
                />
            </label>
        </div>

        <button
            onclick={onResetData}
            class="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-medium transition-colors border border-red-500/20"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
            </svg>
            Reset Tutto
        </button>
    </div>
</section>
