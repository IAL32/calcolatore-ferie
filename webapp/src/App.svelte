<script lang="ts">
  import { onMount } from "svelte";
  import {
    calculateBalance,
    formatDate,
    getHolidaysForYear,
    parseDate,
    type LeaveEntry,
    type Province,
  } from "./lib/calculator";

  import YearHeatmap from "./lib/YearHeatmap.svelte";
  import BalanceCards from "./lib/components/BalanceCards.svelte";
  import Configuration from "./lib/components/Configuration.svelte";
  import LeaveInput from "./lib/components/LeaveInput.svelte";
  import HistoryList from "./lib/components/HistoryList.svelte";
  import YearBreadcrumbs from "./lib/components/YearBreadcrumbs.svelte";

  // Runes
  let startStr = $state("2025-01-01"); // Default start
  let asOfStr = $state(formatDate(new Date())); // Default today
  let userLeaves = $state<LeaveEntry[]>([]); // User entered leaves only

  // Config
  let ferieYearly = $state(160.0);
  let parYearly = $state(104.0);
  let province = $state<Province>("MI");

  // Derived

  // Calculate holidays based on years present in user leaves + current/start settings
  let holidays = $derived.by(() => {
    const years = new Set<number>();
    const startYear = new Date(startStr).getFullYear();
    years.add(startYear);
    years.add(new Date(asOfStr).getFullYear());
    // Also include next year for planning?
    years.add(new Date().getFullYear());
    years.add(new Date().getFullYear() + 1);

    // Add years from user leaves
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

  // Year Navigation State
  let viewYear = $state(new Date().getFullYear());

  let availableYears = $derived.by(() => {
    // Only show 3 years max: [viewYear-1, viewYear, viewYear+1]
    const startYear = new Date(startStr).getFullYear();
    const targets = [viewYear - 1, viewYear, viewYear + 1];

    // Also include startYear explicitly if not in range?
    // Or just filter.
    return targets.filter((y) => y >= startYear);
  });

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

  // Reactive Persistence
  $effect(() => {
    localStorage.setItem("ferie_start_date", startStr);
    localStorage.setItem("ferie_leaves", JSON.stringify(userLeaves));
    localStorage.setItem("ferie_yearly_hours", ferieYearly.toString());
    localStorage.setItem("par_yearly_hours", parYearly.toString());
    localStorage.setItem("ferie_province", province);
  });

  function handleAddLeaves(newEntries: LeaveEntry[]) {
    userLeaves = [...userLeaves, ...newEntries].sort((a, b) =>
      a.d.localeCompare(b.d),
    );
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

  function resetData() {
    if (
      !confirm(
        "Sei sicuro di voler resettare TUTTI i dati e la configurazione? Questa azione non può essere annullata.",
      )
    ) {
      return;
    }

    userLeaves = [];
    startStr = "2025-01-01";
    asOfStr = formatDate(new Date());
    ferieYearly = 160.0;
    parYearly = 104.0;
    province = "MI";
  }

  // Remove Group Logic - needs to stay here or move to HistoryList?
  // It modifies userLeaves, so logic should ideally move here or pass a callback.
  // HistoryList received onRemove.

  function removeGroup(group: any) {
    // Use type Any or import GroupedLeave type if exported?
    // Let's redefine type locally or export from calculator if we want full strictness
    // or just rely on structural typing.
    // Ideally we should export GroupedLeave from calculator or share it.
    // But GroupedLeave is presentation logic.
    // Let's just implement the logic.

    if (group.type === "festa") return;

    const groupStart = parseDate(group.start);
    const groupEnd = parseDate(group.end);

    userLeaves = userLeaves.filter((l) => {
      if (l.type !== group.type) return true;
      const d = parseDate(l.d);
      if (d >= groupStart && d <= groupEnd) {
        return false;
      }
      return true;
    });
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
    <BalanceCards report={balance} />

    <Configuration
      bind:startStr
      bind:asOfStr
      bind:ferieYearly
      bind:parYearly
      bind:province
      onExportData={exportCSV}
      onImportData={importCSV}
      onResetData={resetData}
    />

    <section class="bg-slate-800/30 border border-white/5 rounded-2xl p-6">
      <h3
        class="text-lg font-semibold text-white mb-6 flex justify-between items-center"
      >
        <span>Storico & Simulazione</span>
        <div class="flex gap-2 items-center">
          <!-- Year Navigation -->
          <YearBreadcrumbs
            bind:viewYear
            {availableYears}
            startYear={new Date(startStr).getFullYear()}
          />

          <span
            class="text-xs font-normal text-slate-400 bg-slate-800 px-3 py-1 rounded-full"
            >{userLeaves.length} voci</span
          >
        </div>
      </h3>

      <div class="mb-8">
        <YearHeatmap year={viewYear} {leaves} />
      </div>

      <LeaveInput onAddLeaves={handleAddLeaves} />

      <div class="mt-8 border-t border-white/5 pt-6">
        <h4
          class="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider"
        >
          Lista Movimenti
        </h4>
        <HistoryList {leaves} onRemoveGroup={removeGroup} />
      </div>
    </section>
  </main>
</div>
