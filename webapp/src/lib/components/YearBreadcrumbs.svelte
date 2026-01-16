<script lang="ts">
    interface Props {
        viewYear: number;
        availableYears: number[];
        startYear: number;
    }

    let { viewYear = $bindable(), availableYears, startYear }: Props = $props();

    function prevYear() {
        if (viewYear > startYear) {
            viewYear--;
        }
    }

    function nextYear() {
        viewYear++;
    }
</script>

<div class="flex items-center gap-1 bg-slate-900/50 rounded-lg p-1 mr-4">
    <button
        onclick={prevYear}
        disabled={viewYear <= startYear}
        aria-label="Anno precedente"
        class="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
                d="M15 19l-7-7 7-7"
            />
        </svg>
    </button>

    {#each availableYears as y}
        <button
            onclick={() => (viewYear = y)}
            class="px-2 py-0.5 text-xs font-mono rounded transition-colors {viewYear ===
            y
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-500 hover:text-slate-300'}"
        >
            {y}
        </button>
    {/each}

    <button
        onclick={nextYear}
        aria-label="Anno successivo"
        class="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
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
                d="M9 5l7 7-7 7"
            />
        </svg>
    </button>
</div>
