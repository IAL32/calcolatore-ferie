<script lang="ts">
  import { onMount } from "svelte";
  import {
    accrueHoursBetween,
    allocateUsage,
    calculateBalance,
    formatDate,
    getWorkingDaysInRange,
    getHolidaysForYear,
    parseDate,
    type BalanceReport,
    type LeaveEntry,
    type Province,
  } from "./lib/calculator";

  import YearHeatmap from "./lib/YearHeatmap.svelte";

  // Runes
  let startStr = $state("2025-01-01"); // Default start
  let asOfStr = $state(formatDate(new Date())); // Default today
  let userLeaves = $state<LeaveEntry[]>([]); // User entered leaves only

  // Config
  let ferieYearly = $state(160.0);
  let parYearly = $state(104.0);
  let province = $state<Province>("MI");

  // Flag to track if we are performing a province update to avoid loops if needed
  // Not needed if we just rely on reactivity

  // New leave input state
  let isRange = $state(false);
  // isHoliday removed as per requirement
  let newLeaveDate = $state("");
  let newLeaveDateEnd = $state("");
  let newLeaveHours = $state(8);
  let newLeaveNote = $state("");

  // Derived

  // Calculate holidays based on years present in user leaves + current/start settings
  let holidays = $derived.by(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear());
    years.add(new Date(startStr).getFullYear());
    userLeaves.forEach((l) => years.add(parseDate(l.d).getFullYear()));

    let h: LeaveEntry[] = [];
    years.forEach((y) => {
      h = [...h, ...getHolidaysForYear(y, province)];
    });
    return h;
  });

  // Combined leaves for calculation
  let leaves = $derived(
    [...userLeaves, ...holidays].sort((a, b) => a.d.localeCompare(b.d)),
  );

  let balance = $derived(
    calculateBalance(asOfStr, startStr, leaves, ferieYearly, parYearly),
  );
  let currentYear = $derived(new Date(parseDate(asOfStr)).getFullYear());

  // Persistence
  onMount(() => {
    // Legacy migration? No, just use new keys.
    const savedStart = localStorage.getItem("ferie_start_date");
    if (savedStart) startStr = savedStart;

    const savedLeaves = localStorage.getItem("ferie_leaves");
    if (savedLeaves) {
      const parsed: LeaveEntry[] = JSON.parse(savedLeaves);
      // Migration: Filter out old 'festa' items if they were saved in the single list
      // We only want to keep user-entered items (ferie)
      userLeaves = parsed.filter((l) => l.type !== "festa");
    }
    // No else block needed: if empty, userLeaves is [], holidays derived automatically

    const savedFerie = localStorage.getItem("ferie_yearly_hours");
    if (savedFerie) ferieYearly = parseFloat(savedFerie);

    const savedPar = localStorage.getItem("par_yearly_hours");
    if (savedPar) parYearly = parseFloat(savedPar);

    const savedProvince = localStorage.getItem("ferie_province");
    if (savedProvince && (savedProvince === "MI" || savedProvince === "IT")) {
      province = savedProvince as Province;
    }
  });

  // Reactive holiday update removed - now handled via derived `holidays`

  $effect(() => {
    localStorage.setItem("ferie_start_date", startStr);
    localStorage.setItem("ferie_leaves", JSON.stringify(userLeaves));
    localStorage.setItem("ferie_yearly_hours", ferieYearly.toString());
    localStorage.setItem("par_yearly_hours", parYearly.toString());
    localStorage.setItem("ferie_province", province);
  });

  function addLeave() {
    if (isRange) {
      // Range logic
      const days = getWorkingDaysInRange(newLeaveDate, newLeaveDateEnd);
      const newEntries: LeaveEntry[] = days.map((d) => ({
        d,
        hours: newLeaveHours,
        note: newLeaveNote,
        type: "ferie",
      }));
      userLeaves = [...userLeaves, ...newEntries].sort((a, b) =>
        a.d.localeCompare(b.d),
      );
    } else {
      // Single Day
      userLeaves = [
        ...userLeaves,
        {
          d: newLeaveDate,
          hours: newLeaveHours,
          note: newLeaveNote,
          type: "ferie",
        } as LeaveEntry,
      ].sort((a, b) => a.d.localeCompare(b.d));
    }

    // Reset inputs partially
    if (!isRange) newLeaveDate = "";
    // keep note?
    newLeaveDateEnd = "";
    newLeaveHours = 8;
    newLeaveNote = "";
  }

  function exportCSV() {
    // We want to be compatible with python script: date,hours_taken,note
    // But we also want to save the start date if possible.
    // Python ignores lines it can't parse? No, DictReader expects headers.
    // Let's add a comment line at the top with metadata, hopefully python script ignores it?
    // Actually the python script uses `csv.DictReader(f)`. If the first line is `# metadata`, it will likely be taken as header.
    // Safer: Standard CSV.

    const headers = "date,hours_taken,note";
    const rows = leaves.map((l) => `${l.d},${l.hours},${l.note || ""}`);
    const content = [headers, ...rows].join("\n");

    // Create download
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "ferie_data.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function importCSV(e: Event) {
    const target = e.target as HTMLInputElement;
    if (!target.files?.length) return;

    const file = target.files[0];
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      const lines = text
        .split(/\r?\n/)
        .filter((line) => line.trim() && !line.startsWith("#"));
      // Expect header: date,hours_taken,note
      // Simple parse
      const newLeaves: LeaveEntry[] = [];
      let headerFound = false;

      for (const line of lines) {
        if (!headerFound) {
          // Skip header line
          if (line.toLowerCase().includes("date")) {
            headerFound = true;
            continue;
          }
        }

        // CSV split (naive, assuming no commas in notes logic for now, or handle quotes?)
        // The python script output might be simple. Let's assume simple split.
        const parts = line.split(",");
        if (parts.length < 2) continue;

        const d = parts[0].trim();
        const h = parseFloat(parts[1].trim());
        const n = parts.slice(2).join(",").trim(); // Remainder is note

        if (d && !isNaN(h)) {
          newLeaves.push({ d, hours: h, note: n });
        }
      }

      if (newLeaves.length > 0) {
        userLeaves = newLeaves.sort((a, b) =>
          parseDate(a.d) > parseDate(b.d) ? 1 : -1,
        );
        alert(`Importate ${userLeaves.length} voci.`);
      } else {
        alert("Nessuna voce valida trovata nel CSV.");
      }

      // Reset input
      target.value = "";
    };
    reader.readAsText(file);
  }

  // Grouping Logic
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

      const isConsecutive = diffDays <= 4; // Allow Fri -> Mon (3 days gap?) No, Fri=5, Mon=8. diff is 3. So <= 4 is safe.
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

  function removeGroup(group: GroupedLeave) {
    // Remove all indices associated with this group
    // We filter by ID implies we filter leaves whose index is NOT in group.originalIndices
    // Need to rely on value equality or IDs?
    // Since leaves is mutable and indices shift, it's tricky to delete by index if we delete multiple.
    // Easier: Filter out the specific objects that formed the group.

    // Actually, `leaves` is source of truth.
    // We can map `leaves` to include a temporary ID? No.
    // Simple way: Filter out leaves that match the group criteria?
    // Or just re-construct `leaves` excluding the ones in this group.

    // Since we computed groupedLeaves from `leaves` (sorted), the indices in `originalIndices` *were* correct at render time.
    // If we assume no concurrent edits (single user), we can use the indices, BUT valid mainly if we delete from back to front?
    // Better: identifying leaves by their properties is ambiguous (duplicates allowed).
    // Let's rely on iteration structure.
    // We will generate a SET of indices to remove.
    // We will generate a SET of indices to remove.
    // If we are removing a group, it might be holidays.
    if (group.type === "festa") return; // Cannot remove holidays

    // We need to match userLeaves.
    // Problem: originalIndices referred to `leaves` (combined).
    // We can't use indices from `groupedLeaves` (combined) to filter `userLeaves` (subset).

    // Instead, filter `userLeaves` by matching content of group?
    // Or simpler: filter out any user leave that falls in the group range/criteria.

    const groupStart = parseDate(group.start);
    const groupEnd = parseDate(group.end);

    userLeaves = userLeaves.filter((l) => {
      // Keep if type is diff (shouldn't happen if we only select ferie groups)
      if (l.type !== group.type) return true;

      const d = parseDate(l.d);
      // If in range
      if (d >= groupStart && d <= groupEnd) {
        // Also check hours/note?
        // Usually date range is sufficient for "removing this block"
        return false;
      }
      return true;
    });
  }

  function fmtH(h: number) {
    return `${h.toFixed(2)} h`;
  }

  function fmtD(h: number) {
    const d = h / 8.0;
    return `${d.toFixed(2)} gg`;
  }
</script>

<div
  class="min-h-screen bg-slate-900 text-slate-100 font-inter selection:bg-purple-500 selection:text-white pb-20"
>
  <!-- Hero Section -->
  <header
    class="bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 py-12 px-6 shadow-2xl border-b border-indigo-500/20"
  >
    <div class="max-w-4xl mx-auto">
      <h1
        class="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 to-purple-200 mb-2"
      >
        Calcolatore Ferie
      </h1>
      <p class="text-indigo-200/60 text-lg">
        Gestisci e prevedi le tue ferie e permessi con precisione.
      </p>
    </div>
  </header>

  <main class="max-w-4xl mx-auto px-6 -mt-8 space-y-8">
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
            <div class="text-slate-400 text-xs uppercase mb-1">Maturate</div>
            <div class="text-2xl font-mono text-white">
              {fmtH(balance.ferie_earned)}
            </div>
            <div class="text-xs text-slate-500">
              {fmtD(balance.ferie_earned)}
            </div>
          </div>
          <div>
            <div class="text-slate-400 text-xs uppercase mb-1">Residuo</div>
            <div
              class="{balance.ferie_rem < 0
                ? 'text-red-400'
                : 'text-emerald-400'} text-3xl font-bold font-mono"
            >
              {fmtH(balance.ferie_rem)}
            </div>
            <div class="text-xs text-slate-500">{fmtD(balance.ferie_rem)}</div>
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
            <div class="text-slate-400 text-xs uppercase mb-1">Maturati</div>
            <div class="text-2xl font-mono text-white">
              {fmtH(balance.par_earned)}
            </div>
            <div class="text-xs text-slate-500">{fmtD(balance.par_earned)}</div>
          </div>
          <div>
            <div class="text-slate-400 text-xs uppercase mb-1">Residuo</div>
            <div
              class="{balance.par_rem < 0
                ? 'text-red-400'
                : 'text-emerald-400'} text-3xl font-bold font-mono"
            >
              {fmtH(balance.par_rem)}
            </div>
            <div class="text-xs text-slate-500">{fmtD(balance.par_rem)}</div>
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
              {fmtH(balance.used)}
            </div>
            <div class="text-xs text-slate-500">{fmtD(balance.used)}</div>
          </div>
          <div>
            <div class="text-slate-400 text-xs uppercase mb-1">
              Saldo Finale
            </div>
            <div
              class="{balance.total_rem < 0
                ? 'text-red-400'
                : 'text-emerald-400'} text-4xl font-bold font-mono"
            >
              {fmtH(balance.total_rem)}
            </div>
            <div class="text-xs text-slate-500">{fmtD(balance.total_rem)}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Configuration -->
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
      <div class="mt-6 pt-6 border-t border-white/5 flex gap-4">
        <button
          onclick={exportCSV}
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
            onchange={importCSV}
            class="hidden"
          />
        </label>
      </div>
    </section>

    <!-- Leaves List -->
    <section class="bg-slate-800/30 border border-white/5 rounded-2xl p-6">
      <h3
        class="text-lg font-semibold text-white mb-6 flex justify-between items-center"
      >
        <span>Storico & Simulazione</span>
        <span
          class="text-xs font-normal text-slate-400 bg-slate-800 px-3 py-1 rounded-full"
          >{leaves.length} voci</span
        >
      </h3>

      <div class="mb-8">
        <YearHeatmap year={currentYear} {leaves} />
      </div>

      <!-- Add New -->
      <div
        class="bg-slate-900/40 rounded-xl p-4 mb-6 border border-indigo-500/20"
      >
        <!-- Mode Toggle & Type -->
        <div class="flex justify-between mb-4">
          <!-- Type Toggle removed -->
          <!-- Range Toggle -->

          <!-- Range Toggle -->
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
          {:else}
            <div class="space-y-1">
              <label for="new-leave-start" class="block text-xs text-slate-400"
                >Dal</label
              >
              <input
                id="new-leave-start"
                type="date"
                bind:value={newLeaveDate}
                class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div class="space-y-1">
              <label for="new-leave-end" class="block text-xs text-slate-400"
                >Al</label
              >
              <input
                id="new-leave-end"
                type="date"
                bind:value={newLeaveDateEnd}
                class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          {/if}

          <div class="space-y-1 md:col-span-1">
            <label for="new-leave-note" class="block text-xs text-slate-400"
              >Nota</label
            >
            <input
              id="new-leave-note"
              type="text"
              placeholder={isRange ? "Ferie estive..." : "Visita..."}
              bind:value={newLeaveNote}
              onkeydown={(e) => e.key === "Enter" && addLeave()}
              class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <button
            onclick={addLeave}
            disabled={!newLeaveDate || (isRange && !newLeaveDateEnd)}
            class="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20"
          >
            Aggiungi
          </button>
        </div>
        {#if isRange && newLeaveDate && newLeaveDateEnd}
          <div class="mt-2 text-xs text-slate-500">
            Verranno inseriti {getWorkingDaysInRange(
              newLeaveDate,
              newLeaveDateEnd,
            ).length} giorni lavorativi (8h ciascuno).
          </div>
        {/if}
      </div>

      <!-- List -->
      <div class="space-y-3">
        {#if leaves.length === 0}
          <div class="text-center py-12 text-slate-500 italic">
            Nessuna voce inserita. Aggiungi ferie per vedere il calcolo.
          </div>
        {:else}
          {#each groupedLeaves as group (group.id)}
            <div
              class="group flex items-center justify-between p-4 rounded-xl {group.type ===
              'festa'
                ? 'bg-orange-500/10 border-orange-500/30'
                : 'bg-slate-800/20 border-slate-800/50'} border hover:bg-slate-800/60 transition-colors"
            >
              <div class="flex items-center gap-4">
                <!-- Status indicator -->
                <div
                  class="w-2 h-2 rounded-full {parseDate(group.start) >
                  parseDate(asOfStr)
                    ? 'bg-indigo-400 animate-pulse'
                    : group.type === 'festa'
                      ? 'bg-orange-500'
                      : 'bg-slate-600'}"
                ></div>
                <div>
                  <div class="font-mono text-sm text-slate-200">
                    {#if group.isRange}
                      {group.start} <span class="text-slate-500">→</span>
                      {group.end}
                    {:else}
                      {group.start}
                    {/if}
                    {#if group.type === "festa"}
                      <span
                        class="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-400 uppercase tracking-wide"
                        >Festa</span
                      >
                    {/if}
                  </div>
                  {#if group.note}
                    <div class="text-xs text-slate-500">{group.note}</div>
                  {/if}
                </div>
              </div>
              <div class="flex items-center gap-6">
                <div class="text-right">
                  {#if group.type === "ferie"}
                    <div class="font-mono font-medium text-slate-200">
                      {fmtH(group.totalHours)}
                    </div>
                    <div class="text-xs text-slate-500">
                      {#if group.isRange}
                        {group.days} gg
                      {:else}
                        {fmtD(group.totalHours)}
                      {/if}
                    </div>
                  {:else}
                    <div class="font-mono text-xs text-slate-500 uppercase">
                      n.a.
                    </div>
                  {/if}
                </div>
                <button
                  onclick={() => removeGroup(group)}
                  class="text-slate-500 hover:text-red-400 transition-colors bg-slate-800 p-2 rounded-lg hover:bg-red-900/20"
                  aria-label="Rimuovi"
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
                </button>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </section>
  </main>
</div>
