<script lang="ts">
    import { getWorkingDaysInRange, type LeaveEntry } from "../calculator";

    interface Props {
        onAddLeaves: (newLeaves: LeaveEntry[]) => void;
    }

    let { onAddLeaves }: Props = $props();

    let isRange = $state(false);
    let newLeaveDate = $state("");
    let newLeaveDateEnd = $state("");
    let newLeaveHours = $state(8);
    let newLeaveNote = $state("");

    function handleSubmit() {
        let entries: LeaveEntry[] = [];

        if (isRange) {
            if (!newLeaveDate || !newLeaveDateEnd) return;

            const days = getWorkingDaysInRange(newLeaveDate, newLeaveDateEnd);
            entries = days.map((d) => ({
                d,
                hours: newLeaveHours,
                note: newLeaveNote,
                type: "ferie",
            }));
        } else {
            if (!newLeaveDate) return;

            entries = [
                {
                    d: newLeaveDate,
                    hours: newLeaveHours,
                    note: newLeaveNote,
                    type: "ferie",
                },
            ];
        }

        if (entries.length > 0) {
            onAddLeaves(entries);

            // Reset inputs
            if (!isRange) newLeaveDate = "";
            // keep note/hours? Maybe useful to keep if adding multiple similar
            // Usually clearing note is good practice
            // newLeaveNote = "";
            // newLeaveDateEnd = "";
        }

        // Reset specific inputs as per original logic
        if (!isRange) newLeaveDate = "";
        newLeaveDateEnd = "";
        newLeaveHours = 8;
        newLeaveNote = "";
    }
</script>

<div class="bg-slate-900/40 rounded-xl p-4 mb-6 border border-indigo-500/20">
    <!-- Mode Toggle -->
    <div class="flex justify-between mb-4">
        <div class="bg-slate-800 p-1 rounded-lg inline-flex">
            <button
                onclick={() => (isRange = false)}
                class="px-3 py-1 text-xs font-medium rounded-md transition-all {!isRange
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'}"
            >
                Giorno Singolo
            </button>
            <button
                onclick={() => (isRange = true)}
                class="px-3 py-1 text-xs font-medium rounded-md transition-all {isRange
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'}"
            >
                Range Date
            </button>
        </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        {#if !isRange}
            <div class="space-y-1">
                <label for="new-leave-date" class="block text-xs text-slate-400"
                    >Data</label
                >
                <input
                    id="new-leave-date"
                    type="date"
                    bind:value={newLeaveDate}
                    class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
            </div>
        {:else}
            <div class="space-y-1">
                <label
                    for="new-leave-range-start"
                    class="block text-xs text-slate-400">Dal</label
                >
                <input
                    id="new-leave-range-start"
                    type="date"
                    bind:value={newLeaveDate}
                    class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
            </div>
            <div class="space-y-1">
                <label
                    for="new-leave-range-end"
                    class="block text-xs text-slate-400">Al (incluso)</label
                >
                <input
                    id="new-leave-range-end"
                    type="date"
                    bind:value={newLeaveDateEnd}
                    class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
            </div>
        {/if}

        <div class="space-y-1">
            <label for="new-leave-hours" class="block text-xs text-slate-400"
                >Ore</label
            >
            <input
                id="new-leave-hours"
                type="number"
                step="0.5"
                bind:value={newLeaveHours}
                class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
        </div>

        <div class="space-y-1 md:col-span-1">
            <button
                onclick={handleSubmit}
                disabled={(!isRange && !newLeaveDate) ||
                    (isRange && (!newLeaveDate || !newLeaveDateEnd))}
                class="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Aggiungi
            </button>
        </div>
    </div>

    <div class="space-y-1 mt-4">
        <label for="new-leave-note" class="block text-xs text-slate-400"
            >Nota (Opzionale)</label
        >
        <input
            id="new-leave-note"
            type="text"
            placeholder="Es. Visita medica..."
            bind:value={newLeaveNote}
            class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
        />
    </div>
</div>
