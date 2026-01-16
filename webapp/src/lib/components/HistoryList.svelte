<script lang="ts">
    import { parseDate, type LeaveEntry } from "../calculator";

    interface Props {
        leaves: LeaveEntry[];
        onRemoveGroup: (group: GroupedLeave) => void;
    }

    let { leaves, onRemoveGroup }: Props = $props();

    // Grouping Logic - Moved from App.svelte
    type GroupedLeave = {
        id: string; // unique key for iteration
        isRange: boolean;
        start: string;
        end: string;
        hours: number; // hours per day
        days: number; // total days in group
        totalHours: number; // total hours sum
        note: string;
        type: "ferie" | "festa";
        originalIndices: number[]; // to verify which original indices these map to (for deletion)
    };

    let groupedLeaves = $derived.by(() => {
        if (leaves.length === 0) return [];

        const groups: GroupedLeave[] = [];
        // Leaves are already sorted by date

        let currentGroup: GroupedLeave | null = null;

        leaves.forEach((leave, index) => {
            const lType = leave.type || "ferie";

            // Requirement: Don't show "festa" items in the list
            if (lType === "festa") return;

            if (!currentGroup) {
                currentGroup = {
                    id: `g-${index}`,
                    isRange: false,
                    start: leave.d,
                    end: leave.d,
                    hours: leave.hours,
                    days: 1,
                    totalHours: leave.hours,
                    note: leave.note || "",
                    type: lType,
                    originalIndices: [index],
                };
                return;
            }

            // Check if we can merge
            // Criteria: same hours, same note, consecutive date (allow gaps <= 3 days for weekends)
            const prevDate = parseDate(currentGroup.end);
            const currDate = parseDate(leave.d);
            const diffTime = Math.abs(currDate.getTime() - prevDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            const isConsecutive = diffDays <= 4;
            const sameHours = leave.hours === currentGroup.hours;
            const sameNote = (leave.note || "") === currentGroup.note;
            const sameType = lType === currentGroup.type;

            if (isConsecutive && sameHours && sameNote && sameType) {
                currentGroup.end = leave.d;
                currentGroup.days += 1;
                currentGroup.totalHours += leave.hours;
                currentGroup.isRange = true;
                currentGroup.originalIndices.push(index);
            } else {
                // Push finished group
                groups.push(currentGroup);
                // Start new
                currentGroup = {
                    id: `g-${index}`,
                    isRange: false,
                    start: leave.d,
                    end: leave.d,
                    hours: leave.hours,
                    days: 1,
                    totalHours: leave.hours,
                    note: leave.note || "",
                    type: lType,
                    originalIndices: [index],
                };
            }
        });

        if (currentGroup) {
            groups.push(currentGroup);
        }

        return groups;
    });

    function formatDateRange(start: string, end: string) {
        if (start === end) return parseDate(start).toLocaleDateString("it-IT");
        return `${parseDate(start).toLocaleDateString("it-IT")} - ${parseDate(end).toLocaleDateString("it-IT")}`;
    }
</script>

<div class="space-y-2">
    {#if groupedLeaves.length === 0}
        <div class="text-slate-500 text-sm text-center py-4">
            Nessuna voce inserita.
        </div>
    {/if}

    {#each groupedLeaves as group (group.id)}
        <div
            class="bg-slate-900/40 p-4 rounded-xl border border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group hover:border-indigo-500/30 transition-colors"
        >
            <div>
                <div class="flex items-center gap-2 mb-1">
                    <span class="font-mono text-white text-lg">
                        {formatDateRange(group.start, group.end)}
                    </span>
                    {#if group.isRange}
                        <span
                            class="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded"
                        >
                            {group.days} gg
                        </span>
                    {/if}
                </div>

                <div class="flex items-center gap-2 text-sm text-slate-400">
                    <span class="font-mono text-slate-300"
                        >{group.totalHours}h tot</span
                    >
                    {#if group.note}
                        <span class="text-slate-600">•</span>
                        <span>{group.note}</span>
                    {/if}
                </div>
            </div>

            <button
                onclick={() => onRemoveGroup(group)}
                class="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-1.5 rounded transition-colors opacity-0 group-hover:opacity-100"
            >
                Rimuovi
            </button>
        </div>
    {/each}
</div>
