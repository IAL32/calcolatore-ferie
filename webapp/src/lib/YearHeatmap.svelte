<script lang="ts">
    import { type LeaveEntry, parseDate, formatDate } from "./calculator";

    interface Props {
        year: number;
        leaves: LeaveEntry[];
    }

    let { year, leaves }: Props = $props();

    const MONTHS = [
        "Gennaio",
        "Febbraio",
        "Marzo",
        "Aprile",
        "Maggio",
        "Giugno",
        "Luglio",
        "Agosto",
        "Settembre",
        "Ottobre",
        "Novembre",
        "Dicembre",
    ];

    // Map of date string -> info
    let usageMap = $derived.by(() => {
        const m = new Map<string, { hours: number; type: "ferie" | "festa" }>();
        for (const l of leaves) {
            // If multiple entries for same day, prioritize 'ferie' if it has hours?
            // Or just sum hours and take last type?
            // Assume unique day usually, or just sum hours.
            const existing = m.get(l.d);
            const h = (existing?.hours || 0) + l.hours;
            const t = l.type || "ferie";
            // If any is 'ferie' with >0 hours, stick to ferie?
            // Actually usually 'festa' has 0 hours.
            m.set(l.d, { hours: h, type: t });
        }
        return m;
    });

    function getDaysInMonth(y: number, m: number) {
        return new Date(y, m + 1, 0).getDate();
    }

    function getDayColor(dStr: string) {
        const entry = usageMap.get(dStr);

        // 1. Ferie Taken
        if (entry && entry.hours > 0) {
            if (entry.hours >= 8)
                return "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)] border-emerald-400";
            return "bg-emerald-500/50 border-emerald-400/50";
        }

        // 2. Public Holiday (manually added)
        if (entry && entry.type === "festa") {
            return "bg-orange-500 border-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.4)]";
        }

        // 3. Weekend
        const date = new Date(dStr);
        const day = date.getDay(); // 0Sun, 6Sat
        if (day === 0 || day === 6) {
            return "bg-orange-400/20 border-orange-400/20";
        }

        // 4. Empty
        return "bg-slate-800 border-slate-700/50";
    }

    function getStartPadding(y: number, m: number) {
        // JS getDay(): 0=Sun, 1=Mon ... 6=Sat
        // We want Mon=0, ... Sun=6
        const d = new Date(y, m, 1).getDay();
        // (0 + 6) % 7 = 6 (Sun -> 6)
        // (1 + 6) % 7 = 0 (Mon -> 0)
        return (d + 6) % 7;
    }

    function getTooltip(dStr: string) {
        const entry = usageMap.get(dStr);
        if (!entry) return `${dStr}`;
        if (entry.type === "festa") return `${dStr}: Festa`;
        return `${dStr}: ${entry.hours} ore`;
    }
</script>

<div class="space-y-4">
    <div class="flex items-center justify-between">
        <h3 class="text-white text-sm font-semibold uppercase tracking-wider">
            Panoramica {year}
        </h3>
    </div>

    <div class="grid grid-cols-3 xl:grid-cols-4 gap-4">
        {#each MONTHS as monthName, mIndex}
            {@const daysCount = getDaysInMonth(year, mIndex)}
            {@const padding = getStartPadding(year, mIndex)}

            <div
                class="bg-slate-800/20 rounded-xl p-3 border border-slate-700/30 hover:border-slate-600 transition-colors"
            >
                <div
                    class="text-[0.65rem] text-slate-400 mb-2 font-medium uppercase tracking-wider"
                >
                    {monthName}
                </div>

                <!-- Week Header -->
                <div class="grid grid-cols-7 gap-1 mb-1">
                    {#each ["L", "M", "M", "G", "V", "S", "D"] as d}
                        <div
                            class="text-[0.55rem] text-center text-slate-600 font-mono"
                        >
                            {d}
                        </div>
                    {/each}
                </div>

                <div class="grid grid-cols-7 gap-1 justify-items-center">
                    <!-- Padding -->
                    {#each Array(padding) as _}
                        <div class="w-full aspect-square"></div>
                    {/each}

                    <!-- Calendar Logic -->
                    {#each Array(daysCount) as _, dIndex}
                        {@const dayNum = dIndex + 1}
                        {@const dateStr = formatDate(
                            new Date(year, mIndex, dayNum),
                        )}

                        <div
                            class="w-full aspect-square rounded-sm border {getDayColor(
                                dateStr,
                            )} transition-all duration-300 transform hover:scale-125 hover:z-10 cursor-alias"
                            title={getTooltip(dateStr)}
                        ></div>
                    {/each}
                </div>
            </div>
        {/each}
    </div>
</div>
